import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  DocumentStatus,
  ExecutionStatus,
  Prisma,
  ProjectStatus,
  QcStatus,
  Role,
  StageStatus,
  StageType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { ProjectCodeService } from './project-code.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { LocationInputDto } from './dto/location.dto';
import { allowedTargets, findTransition } from './status-transition';

const RESTRICTED_ROLES: Role[] = [Role.PM, Role.SUPERVISOR, Role.QC];
const WEIGHT_TOLERANCE = 0.01;
const num = (d: Prisma.Decimal | null | undefined): number => (d == null ? 0 : Number(d));

const STAGE_ORDER: StageType[] = [
  StageType.INITIATING,
  StageType.PLANNING,
  StageType.EXECUTING,
  StageType.MONITORING,
  StageType.CLOSING,
];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly codes: ProjectCodeService,
  ) {}

  // ---- helpers ----------------------------------------------------------

  /** Ensures location weights sum to exactly 100 (BR-7), auto-distributing when blank. */
  private normalizeWeights(locations: LocationInputDto[]): LocationInputDto[] {
    const provided = locations.map((l) => l.weightPct ?? 0);
    const sum = provided.reduce((a, b) => a + b, 0);

    if (sum === 0) {
      // none set → distribute evenly, last row absorbs the rounding remainder
      const base = Math.floor((100 / locations.length) * 100) / 100;
      return locations.map((l, i) => ({
        ...l,
        weightPct:
          i === locations.length - 1
            ? Math.round((100 - base * (locations.length - 1)) * 100) / 100
            : base,
      }));
    }
    if (Math.abs(sum - 100) > WEIGHT_TOLERANCE) {
      throw new BadRequestException(
        `Total bobot lokasi harus 100% (saat ini ${sum}%). Gunakan "Bagi rata" atau perbaiki nilainya.`,
      );
    }
    return locations;
  }

  private assertDateOrder(startISO: string, finishISO: string): void {
    if (new Date(finishISO) < new Date(startISO)) {
      throw new BadRequestException('Tanggal selesai harus setelah atau sama dengan tanggal mulai.');
    }
  }

  /** Data-scope rule (§6): PM/Supervisor/QC only see assigned projects. */
  private scopeWhere(actor?: RequestUser): Prisma.ProjectWhereInput {
    if (actor && RESTRICTED_ROLES.includes(actor.role as Role)) {
      return {
        OR: [{ picId: actor.id }, { members: { some: { userId: actor.id } } }],
      };
    }
    return {};
  }

  private async assertContactsExist(clientId: string, picId: string): Promise<void> {
    const [client, pic] = await Promise.all([
      this.prisma.contact.findFirst({ where: { id: clientId, deletedAt: null } }),
      this.prisma.user.findFirst({ where: { id: picId, deletedAt: null } }),
    ]);
    if (!client) throw new BadRequestException('Client tidak ditemukan.');
    if (!pic) throw new BadRequestException('Penanggung jawab (PIC) tidak ditemukan.');
  }

  // ---- create -----------------------------------------------------------

  async create(dto: CreateProjectDto, actor: RequestUser, ip?: string) {
    this.assertDateOrder(dto.startDate, dto.finishDate);
    await this.assertContactsExist(dto.clientId, dto.picId);
    const locations = this.normalizeWeights(dto.locations);
    const year = new Date(dto.startDate).getFullYear();

    const created = await this.prisma.$transaction(async (tx) => {
      const code = await this.codes.next(tx, year);
      const project = await tx.project.create({
        data: {
          code,
          name: dto.name,
          description: dto.description ?? null,
          startDate: new Date(dto.startDate),
          finishDate: new Date(dto.finishDate),
          status: ProjectStatus.DRAFT,
          clientId: dto.clientId,
          picId: dto.picId,
          contractValue: dto.contractValue ?? null,
          initialBudget: dto.initialBudget ?? null,
          createdBy: actor.id,
          updatedBy: actor.id,
          locations: {
            create: locations.map((l) => ({
              name: l.name,
              address: l.address ?? null,
              city: l.city ?? null,
              province: l.province ?? null,
              latitude: l.latitude ?? null,
              longitude: l.longitude ?? null,
              weightPct: l.weightPct ?? 0,
              picId: l.picId ?? null,
            })),
          },
          // 5 stages auto-created, fixed order (§7.2.1)
          stages: {
            create: STAGE_ORDER.map((stageType, i) => ({
              stageType,
              sequence: i + 1,
              status: StageStatus.NOT_STARTED,
            })),
          },
          // PIC utama recorded as a member for data-scope
          members: { create: [{ userId: dto.picId, role: 'PIC_UTAMA' }] },
        },
      });

      await this.audit.log(
        {
          entityType: 'Project',
          entityId: project.id,
          action: AuditAction.CREATE,
          projectId: project.id,
          actor,
          newValue: { code: project.code, name: project.name, status: project.status },
          ipAddress: ip,
        },
        tx,
      );
      return project;
    });

    return this.findOne(created.id, actor);
  }

  // ---- list -------------------------------------------------------------

  async findAll(query: ListProjectsDto, actor?: RequestUser) {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...this.scopeWhere(actor),
    };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.picId) where.picId = query.picId;
    if (query.province) where.locations = { some: { province: query.province } };
    if (query.overbudget) where.isOverbudget = query.overbudget === 'true';
    if (query.search) {
      const s = query.search;
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { client: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const sortable = new Set(['code', 'name', 'startDate', 'finishDate', 'progressPct', 'status']);
    const sortField = sortable.has(query.sort) ? query.sort : 'code';
    const orderBy: Prisma.ProjectOrderByWithRelationInput = {
      [sortField]: query.order === 'desc' ? 'desc' : 'asc',
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          client: { select: { id: true, name: true } },
          pic: { select: { id: true, name: true } },
          locations: { select: { id: true, name: true, province: true } },
          stages: { select: { stageType: true, status: true, sequence: true } },
        },
      }),
    ]);

    return {
      data: rows.map((p) => {
        // current active stage = first not-yet-approved stage (Closing when all approved)
        const ordered = [...p.stages].sort((a, b) => a.sequence - b.sequence);
        const active = ordered.find((s) => s.status !== StageStatus.APPROVED) ?? ordered[ordered.length - 1];
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          client: p.client,
          pic: p.pic,
          locationCount: p.locations.length,
          locations: p.locations,
          startDate: p.startDate,
          finishDate: p.finishDate,
          progressPct: num(p.progressPct),
          totalBudget: num(p.totalBudget),
          actualCost: num(p.actualCost),
          serapanPct: num(p.totalBudget) > 0 ? Math.round((num(p.actualCost) / num(p.totalBudget)) * 10000) / 100 : 0,
          status: p.status,
          activeStage: active ? { stageType: active.stageType, status: active.status } : null,
          isOverbudget: p.isOverbudget,
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  // ---- detail -----------------------------------------------------------

  async findOne(id: string, actor?: RequestUser) {
    const p = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true } },
        pic: { select: { id: true, name: true } },
        locations: {
          where: { deletedAt: null },
          include: { pic: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        stages: { orderBy: { sequence: 'asc' } },
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Proyek tidak ditemukan.');

    if (actor && RESTRICTED_ROLES.includes(actor.role as Role)) {
      const assigned = p.picId === actor.id || p.members.some((m) => m.userId === actor.id);
      if (!assigned) {
        throw new ForbiddenException('Anda tidak ditugaskan pada proyek ini.');
      }
    }

    return {
      ...p,
      progressPct: num(p.progressPct),
      contractValue: p.contractValue == null ? null : num(p.contractValue),
      initialBudget: p.initialBudget == null ? null : num(p.initialBudget),
      totalBudget: num(p.totalBudget),
      actualCost: num(p.actualCost),
      serapanPct: num(p.totalBudget) > 0 ? Math.round((num(p.actualCost) / num(p.totalBudget)) * 10000) / 100 : 0,
      allowedTransitions: allowedTargets(p.status),
      locations: p.locations.map((l) => ({ ...l, weightPct: num(l.weightPct) })),
    };
  }

  // ---- update -----------------------------------------------------------

  async update(id: string, dto: UpdateProjectDto, actor: RequestUser, ip?: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: { stages: true, locations: { where: { deletedAt: null } } },
    });
    if (!existing) throw new NotFoundException('Proyek tidak ditemukan.');
    if (existing.status === ProjectStatus.CLOSED) {
      throw new BadRequestException('Proyek Closed bersifat read-only. Buka kembali (reopen) lebih dulu.');
    }

    const start = dto.startDate ?? existing.startDate.toISOString();
    const finish = dto.finishDate ?? existing.finishDate.toISOString();
    this.assertDateOrder(start, finish);

    if (dto.clientId || dto.picId) {
      await this.assertContactsExist(dto.clientId ?? existing.clientId, dto.picId ?? existing.picId);
    }

    // Reason required when any stage is already approved (BR-3)
    const hasApproved = existing.stages.some((s) => s.status === StageStatus.APPROVED);
    if (hasApproved && !dto.reason) {
      throw new BadRequestException('Perubahan pada proyek dengan tahapan Approved memerlukan alasan.');
    }

    let normalizedLocations: LocationInputDto[] | undefined;
    if (dto.locations) {
      normalizedLocations = this.normalizeWeights(dto.locations);
      // Block removing a location that still has WBS items (§7.1.2)
      const keptIds = new Set(normalizedLocations.filter((l) => l.id).map((l) => l.id));
      const removed = existing.locations.filter((l) => !keptIds.has(l.id));
      for (const loc of removed) {
        const count = await this.prisma.wbsItem.count({ where: { locationId: loc.id, deletedAt: null } });
        if (count > 0) {
          throw new BadRequestException(
            `Lokasi "${loc.name}" tidak dapat dihapus karena masih memiliki ${count} kegiatan. Pindahkan kegiatan lebih dulu.`,
          );
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          description: dto.description ?? undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          finishDate: dto.finishDate ? new Date(dto.finishDate) : undefined,
          clientId: dto.clientId ?? undefined,
          picId: dto.picId ?? undefined,
          contractValue: dto.contractValue ?? undefined,
          initialBudget: dto.initialBudget ?? undefined,
          updatedBy: actor.id,
        },
      });

      if (normalizedLocations) {
        const keptIds = new Set(normalizedLocations.filter((l) => l.id).map((l) => l.id));
        // soft-delete removed
        await tx.projectLocation.updateMany({
          where: { projectId: id, deletedAt: null, id: { notIn: [...keptIds] as string[] } },
          data: { deletedAt: new Date() },
        });
        // upsert kept / create new
        for (const l of normalizedLocations) {
          if (l.id) {
            await tx.projectLocation.update({
              where: { id: l.id },
              data: {
                name: l.name,
                address: l.address ?? null,
                city: l.city ?? null,
                province: l.province ?? null,
                weightPct: l.weightPct ?? 0,
                picId: l.picId ?? null,
              },
            });
          } else {
            await tx.projectLocation.create({
              data: {
                projectId: id,
                name: l.name,
                address: l.address ?? null,
                city: l.city ?? null,
                province: l.province ?? null,
                weightPct: l.weightPct ?? 0,
                picId: l.picId ?? null,
              },
            });
          }
        }
      }

      await this.audit.log(
        {
          entityType: 'Project',
          entityId: id,
          action: AuditAction.UPDATE,
          projectId: id,
          actor,
          oldValue: { name: existing.name, description: existing.description },
          newValue: { name: project.name, description: project.description },
          reason: dto.reason ?? null,
          ipAddress: ip,
        },
        tx,
      );
      return project;
    });

    return this.findOne(updated.id, actor);
  }

  // ---- soft delete ------------------------------------------------------

  async remove(id: string, actor: RequestUser, reason?: string, ip?: string) {
    const existing = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Proyek tidak ditemukan.');

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actor.id } });
      await this.audit.log(
        {
          entityType: 'Project',
          entityId: id,
          action: AuditAction.DELETE,
          projectId: id,
          actor,
          oldValue: { code: existing.code, status: existing.status },
          reason: reason ?? null,
          ipAddress: ip,
        },
        tx,
      );
    });
    return { id, deleted: true };
  }

  // ---- status transition ------------------------------------------------

  async changeStatus(id: string, to: ProjectStatus, actor: RequestUser, reason?: string, ip?: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: { stages: true },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan.');

    if (project.status === to) {
      throw new BadRequestException(`Proyek sudah berstatus ${to}.`);
    }

    const rule = findTransition(project.status, to);
    if (!rule) {
      const targets = allowedTargets(project.status);
      throw new BadRequestException(
        `Transisi ${project.status} → ${to} tidak diizinkan. Transisi yang tersedia: ${targets.join(', ') || '—'}.`,
      );
    }
    if (!rule.roles.includes(actor.role as Role)) {
      throw new ForbiddenException(
        `Peran ${actor.role} tidak boleh "${rule.label}". Dibutuhkan: ${rule.roles.join(', ')}.`,
      );
    }
    if (rule.reasonRequired && (!reason || reason.trim().length === 0)) {
      throw new BadRequestException(`"${rule.label}" memerlukan alasan.`);
    }

    await this.assertGating(project.id, project.stages, to);

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id },
        data: {
          status: to,
          actualFinishDate: to === ProjectStatus.CLOSED ? new Date() : undefined,
          updatedBy: actor.id,
        },
      });
      await this.audit.log(
        {
          entityType: 'Project',
          entityId: id,
          action: AuditAction.STATUS_CHANGE,
          projectId: id,
          actor,
          oldValue: { status: project.status },
          newValue: { status: to },
          reason: reason ?? null,
          ipAddress: ip,
        },
        tx,
      );
      return p;
    });

    return this.findOne(updated.id, actor);
  }

  /** Data-dependent gating rules (§7.1.3). */
  private async assertGating(
    projectId: string,
    stages: { stageType: StageType; status: StageStatus }[],
    to: ProjectStatus,
  ): Promise<void> {
    const stageOf = (t: StageType) => stages.find((s) => s.stageType === t);

    if (to === ProjectStatus.ACTIVE) {
      const init = stageOf(StageType.INITIATING);
      // reopen (from Completed/Closed) skips this; only enforce coming from Draft
      const fromDraft = !stages.some((s) => s.status === StageStatus.APPROVED && s.stageType !== StageType.INITIATING);
      if (init && init.status !== StageStatus.APPROVED && fromDraft) {
        throw new BadRequestException('Tahap Initiating harus Approved sebelum proyek diaktifkan.');
      }
    }

    if (to === ProjectStatus.COMPLETED) {
      const openExec = await this.prisma.executionRecord.count({
        where: {
          wbsItem: { projectId, deletedAt: null },
          status: { notIn: [ExecutionStatus.DONE, ExecutionStatus.CANCELLED] },
        },
      });
      if (openExec > 0) {
        throw new BadRequestException(`Masih ada ${openExec} kegiatan Executing yang belum selesai.`);
      }
      const openQc = await this.prisma.qcRecord.count({
        where: {
          wbsItem: { projectId, deletedAt: null, isQcRequired: true },
          qcStatus: { notIn: [QcStatus.PASSED, QcStatus.WAIVED] },
        },
      });
      if (openQc > 0) {
        throw new BadRequestException(`Masih ada ${openQc} item wajib QC yang belum Passed/Waived.`);
      }
    }

    if (to === ProjectStatus.CLOSED) {
      const closing = stageOf(StageType.CLOSING);
      if (closing && closing.status !== StageStatus.APPROVED) {
        throw new BadRequestException('Tahap Closing harus Approved sebelum proyek ditutup.');
      }
      const pendingDocs = await this.prisma.projectDocument.count({
        where: {
          projectId,
          isRequired: true,
          status: { notIn: [DocumentStatus.TERVERIFIKASI, DocumentStatus.TIDAK_BERLAKU] },
        },
      });
      if (pendingDocs > 0) {
        throw new BadRequestException(`Masih ada ${pendingDocs} dokumen wajib yang belum lengkap.`);
      }
    }
  }
}
