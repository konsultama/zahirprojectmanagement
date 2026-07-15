import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, Role, StageStatus, StageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { WbsService } from './wbs.service';
import { OverbudgetDto } from './dto/wbs.dto';

const MIN_REASON = 20;

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly wbs: WbsService,
  ) {}

  private async getStages(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { stages: true },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan.');
    const initiating = project.stages.find((s) => s.stageType === StageType.INITIATING);
    const planning = project.stages.find((s) => s.stageType === StageType.PLANNING);
    if (!planning) throw new NotFoundException('Tahap Planning tidak ditemukan.');
    return { project, initiating, planning };
  }

  /** Evaluate budget vs estimate against the overbudget matrix (§8.3). */
  private evaluateBudget(project: {
    totalBudget: Prisma.Decimal;
    initialBudget: Prisma.Decimal | null;
    allowOverbudget: boolean;
    overbudgetTolerancePct: Prisma.Decimal | null;
    overbudgetReason: string | null;
  }): { over: boolean; blocked: boolean; message?: string } {
    const total = Number(project.totalBudget);
    const estimate = project.initialBudget == null ? null : Number(project.initialBudget);
    if (estimate == null || total <= estimate) return { over: false, blocked: false };

    // total > estimate
    const excess = total - estimate;
    if (!project.allowOverbudget) {
      return {
        over: true,
        blocked: true,
        message: `Total Rencana melebihi Estimasi Awal sebesar Rp ${excess.toLocaleString('id-ID')}. Aktifkan "Izinkan Overbudget" atau turunkan anggaran.`,
      };
    }
    // allowOverbudget ON
    if (!project.overbudgetReason || project.overbudgetReason.trim().length < MIN_REASON) {
      return { over: true, blocked: true, message: `Alasan overbudget wajib diisi (min. ${MIN_REASON} karakter).` };
    }
    const tol = project.overbudgetTolerancePct == null ? 0 : Number(project.overbudgetTolerancePct);
    const ceiling = estimate * (1 + tol / 100);
    if (total > ceiling) {
      return {
        over: true,
        blocked: true,
        message: `Total Rencana melampaui batas toleransi overbudget (${tol}%). Maksimum Rp ${ceiling.toLocaleString('id-ID')}.`,
      };
    }
    return { over: true, blocked: false };
  }

  async setOverbudget(projectId: string, dto: OverbudgetDto, actor: RequestUser, ip?: string) {
    const { project } = await this.getStages(projectId);
    if (dto.allowOverbudget) {
      if (!dto.reason || dto.reason.trim().length < MIN_REASON) {
        throw new BadRequestException(`Alasan overbudget wajib diisi (min. ${MIN_REASON} karakter).`);
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          allowOverbudget: dto.allowOverbudget,
          overbudgetTolerancePct: dto.allowOverbudget ? dto.tolerancePct ?? 0 : null,
          overbudgetReason: dto.allowOverbudget ? dto.reason ?? null : null,
        },
      });
      await this.audit.log(
        { entityType: 'Project', entityId: projectId, action: AuditAction.UPDATE, projectId, actor, newValue: { allowOverbudget: dto.allowOverbudget, tolerancePct: dto.tolerancePct }, reason: dto.reason ?? null, ipAddress: ip },
        tx,
      );
    });
    return this.wbs.getTree(projectId);
  }

  async submit(projectId: string, actor: RequestUser, ip?: string) {
    const { project, initiating, planning } = await this.getStages(projectId);

    if (initiating?.status !== StageStatus.APPROVED) {
      throw new BadRequestException('Tahap Initiating harus Approved sebelum Planning bisa diajukan.');
    }
    if (planning.status === StageStatus.APPROVED) throw new BadRequestException('Planning sudah disetujui.');
    if (planning.status === StageStatus.SUBMITTED) throw new BadRequestException('Planning sudah diajukan.');

    const leafCount = await this.prisma.wbsItem.count({
      where: { projectId, deletedAt: null, itemType: { not: 'GROUP' } },
    });
    if (leafCount === 0) throw new BadRequestException('RAB masih kosong. Tambahkan minimal satu kegiatan.');

    const verdict = this.evaluateBudget(project);
    if (verdict.blocked) throw new BadRequestException(verdict.message);

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: projectId }, data: { isOverbudget: verdict.over } });
      await tx.projectStage.update({
        where: { id: planning.id },
        data: { status: StageStatus.SUBMITTED, rejectionReason: null, completionPct: 100 },
      });
      await this.audit.log(
        { entityType: 'ProjectStage', entityId: planning.id, action: AuditAction.UPDATE, projectId, actor, newValue: { status: 'SUBMITTED', overbudget: verdict.over }, ipAddress: ip },
        tx,
      );
    });
    return this.wbs.getTree(projectId);
  }

  async approve(projectId: string, actor: RequestUser, ip?: string) {
    const { project, planning } = await this.getStages(projectId);
    if (planning.status !== StageStatus.SUBMITTED) {
      throw new BadRequestException('Hanya Planning berstatus "Diajukan" yang bisa disetujui.');
    }
    // Overbudget plans need Finance (or Admin) approval (§7.2.3 D)
    if (project.isOverbudget && !([Role.ADMIN, Role.FINANCE] as Role[]).includes(actor.role as Role)) {
      throw new ForbiddenException('Planning overbudget memerlukan persetujuan Finance atau Admin.');
    }

    await this.prisma.$transaction(async (tx) => {
      // snapshot Baseline vN (§7.2.3 E)
      const lastVersion = await tx.wbsBaseline.findFirst({
        where: { wbsItem: { projectId } },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = (lastVersion?.version ?? 0) + 1;
      const items = await tx.wbsItem.findMany({ where: { projectId, deletedAt: null } });
      if (items.length > 0) {
        await tx.wbsBaseline.createMany({
          data: items.map((it) => ({
            wbsItemId: it.id,
            version,
            wbsNumber: it.wbsNumber,
            name: it.name,
            itemType: it.itemType,
            qty: it.qty,
            unitBudget: it.unitBudget,
            totalBudget: it.totalBudget,
            weightPct: it.weightPct,
            startDate: it.startDate,
            endDate: it.endDate,
          })),
        });
      }
      await tx.projectStage.update({
        where: { id: planning.id },
        data: {
          status: StageStatus.APPROVED,
          completionPct: 100,
          approvedById: actor.id,
          approvedAt: new Date(),
          actualEnd: new Date(),
          rejectionReason: null,
        },
      });
      // ensure Executing & Monitoring exist as mirrors happens lazily elsewhere
      await this.audit.log(
        { entityType: 'ProjectStage', entityId: planning.id, action: AuditAction.APPROVE, projectId, actor, newValue: { status: 'APPROVED', baselineVersion: version }, ipAddress: ip },
        tx,
      );
    });
    return this.wbs.getTree(projectId);
  }

  async reject(projectId: string, reason: string, actor: RequestUser, ip?: string) {
    const { planning } = await this.getStages(projectId);
    if (planning.status !== StageStatus.SUBMITTED) {
      throw new BadRequestException('Hanya Planning berstatus "Diajukan" yang bisa ditolak.');
    }
    if (!reason || reason.trim().length === 0) throw new BadRequestException('Alasan penolakan wajib diisi.');
    await this.prisma.$transaction(async (tx) => {
      await tx.projectStage.update({
        where: { id: planning.id },
        data: { status: StageStatus.IN_PROGRESS, rejectionReason: reason },
      });
      await this.audit.log(
        { entityType: 'ProjectStage', entityId: planning.id, action: AuditAction.REJECT, projectId, actor, reason, ipAddress: ip },
        tx,
      );
    });
    return this.wbs.getTree(projectId);
  }

  async baselines(projectId: string) {
    const rows = await this.prisma.wbsBaseline.findMany({
      where: { wbsItem: { projectId } },
      orderBy: [{ version: 'desc' }, { wbsNumber: 'asc' }],
    });
    const versions = [...new Set(rows.map((r) => r.version))];
    return versions.map((v) => {
      const inV = rows.filter((r) => r.version === v);
      const leaves = inV.filter((r) => r.itemType !== 'GROUP');
      return {
        version: v,
        snapshotAt: inV[0]?.snapshotAt,
        // sum leaves only — group rows are aggregators and would double-count
        total: leaves.reduce((s, r) => s + Number(r.totalBudget), 0),
        itemCount: inV.length,
      };
    });
  }
}
