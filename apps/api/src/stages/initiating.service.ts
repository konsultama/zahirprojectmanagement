import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, StageStatus, StageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { DEFAULT_INITIATING_CHECKLIST } from './initiating.template';
import { ChecklistUpdateDto, RejectDto, SaveInitiatingDto } from './dto/initiating.dto';

const num = (d: Prisma.Decimal | null | undefined): number | null => (d == null ? null : Number(d));

@Injectable()
export class InitiatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getStage(projectId: string) {
    const stage = await this.prisma.projectStage.findFirst({
      where: { projectId, stageType: StageType.INITIATING, project: { deletedAt: null } },
    });
    if (!stage) throw new NotFoundException('Proyek atau tahap Initiating tidak ditemukan.');
    return stage;
  }

  /** Loads the Initiating stage, lazily creating an empty form + default checklist. */
  async get(projectId: string) {
    const stage = await this.getStage(projectId);

    let form = await this.prisma.initiatingForm.findUnique({
      where: { stageId: stage.id },
      include: {
        deliverables: { orderBy: { id: 'asc' } },
        stakeholders: { orderBy: { id: 'asc' } },
        initialRisks: { orderBy: { id: 'asc' } },
      },
    });
    if (!form) {
      form = await this.prisma.initiatingForm.create({
        data: { stageId: stage.id, objective: '' },
        include: { deliverables: true, stakeholders: true, initialRisks: true },
      });
    }

    let checklist = await this.prisma.initiatingChecklist.findMany({
      where: { stageId: stage.id },
      orderBy: { sortOrder: 'asc' },
    });
    if (checklist.length === 0) {
      await this.prisma.initiatingChecklist.createMany({
        data: DEFAULT_INITIATING_CHECKLIST.map((c, i) => ({
          stageId: stage.id,
          text: c.text,
          isRequired: c.isRequired,
          sortOrder: i + 1,
        })),
      });
      checklist = await this.prisma.initiatingChecklist.findMany({
        where: { stageId: stage.id },
        orderBy: { sortOrder: 'asc' },
      });
    }

    const missing = this.computeMissing(form, checklist);
    return {
      stage: {
        id: stage.id,
        status: stage.status,
        completionPct: Number(stage.completionPct),
        approvedAt: stage.approvedAt,
        rejectionReason: stage.rejectionReason,
      },
      form: {
        ...form,
        initialBudget: num(form.initialBudget),
        assumptions: (form.assumptions as string[] | null) ?? [],
        constraints: (form.constraints as string[] | null) ?? [],
      },
      checklist,
      requiredChecklistDone: checklist.filter((c) => c.isRequired && c.isChecked).length,
      requiredChecklistTotal: checklist.filter((c) => c.isRequired).length,
      missing,
      canSubmit: missing.length === 0,
      readOnly: stage.status === StageStatus.APPROVED,
    };
  }

  private computeMissing(
    form: { objective: string; inScope: string | null; initialBudget: Prisma.Decimal | null; estimatedDays: number | null; sponsorApproverId: string | null; deliverables: unknown[]; stakeholders: unknown[] },
    checklist: { text: string; isRequired: boolean; isChecked: boolean }[],
  ): string[] {
    const missing: string[] = [];
    if (!form.objective?.trim()) missing.push('Tujuan Proyek');
    if (!form.inScope?.trim()) missing.push('Ruang Lingkup (In Scope)');
    if (form.initialBudget == null) missing.push('Estimasi Anggaran Awal');
    if (form.estimatedDays == null) missing.push('Estimasi Durasi');
    if (!form.sponsorApproverId) missing.push('Sponsor / Approver');
    if (form.deliverables.length === 0) missing.push('Deliverable Utama (min. 1)');
    if (form.stakeholders.length === 0) missing.push('Stakeholder (min. 1)');
    for (const c of checklist) {
      if (c.isRequired && !c.isChecked) missing.push(`Checklist: ${c.text}`);
    }
    return missing;
  }

  private async recomputeCompletion(stageId: string): Promise<number> {
    const form = await this.prisma.initiatingForm.findUnique({
      where: { stageId },
      include: { deliverables: true, stakeholders: true },
    });
    const checklist = await this.prisma.initiatingChecklist.findMany({ where: { stageId } });
    if (!form) return 0;
    const missing = this.computeMissing(form, checklist);
    // total required checkpoints = 7 form items + required checklist items
    const totalRequired = 7 + checklist.filter((c) => c.isRequired).length;
    const done = totalRequired - missing.length;
    const pct = totalRequired === 0 ? 0 : Math.round((done / totalRequired) * 100);
    await this.prisma.projectStage.update({ where: { id: stageId }, data: { completionPct: pct } });
    return pct;
  }

  async save(projectId: string, dto: SaveInitiatingDto, actor: RequestUser, ip?: string) {
    const stage = await this.getStage(projectId);
    if (stage.status === StageStatus.APPROVED && !dto.reason) {
      throw new BadRequestException('Perubahan pada tahap yang sudah Approved memerlukan alasan.');
    }

    await this.get(projectId); // ensure form + checklist exist
    const form = await this.prisma.initiatingForm.findUniqueOrThrow({ where: { stageId: stage.id } });

    await this.prisma.$transaction(async (tx) => {
      await tx.initiatingForm.update({
        where: { id: form.id },
        data: {
          objective: dto.objective ?? undefined,
          inScope: dto.inScope ?? undefined,
          outOfScope: dto.outOfScope ?? undefined,
          assumptions: dto.assumptions ?? undefined,
          constraints: dto.constraints ?? undefined,
          initialBudget: dto.initialBudget ?? undefined,
          estimatedDays: dto.estimatedDays ?? undefined,
          sponsorApproverId: dto.sponsorApproverId ?? undefined,
        },
      });

      if (dto.deliverables) {
        await tx.initiatingDeliverable.deleteMany({ where: { formId: form.id } });
        if (dto.deliverables.length > 0) {
          await tx.initiatingDeliverable.createMany({
            data: dto.deliverables.map((d) => ({
              formId: form.id,
              name: d.name,
              description: d.description ?? null,
              targetDate: d.targetDate ? new Date(d.targetDate) : null,
            })),
          });
        }
      }
      if (dto.stakeholders) {
        await tx.initiatingStakeholder.deleteMany({ where: { formId: form.id } });
        if (dto.stakeholders.length > 0) {
          await tx.initiatingStakeholder.createMany({
            data: dto.stakeholders.map((s) => ({
              formId: form.id,
              name: s.name,
              role: s.role ?? null,
              contact: s.contact ?? null,
              influence: (s.influence as never) ?? undefined,
            })),
          });
        }
      }
      if (dto.initialRisks) {
        await tx.initiatingRisk.deleteMany({ where: { formId: form.id } });
        if (dto.initialRisks.length > 0) {
          await tx.initiatingRisk.createMany({
            data: dto.initialRisks.map((r) => ({
              formId: form.id,
              description: r.description,
              impact: r.impact ?? null,
              likelihood: r.likelihood ?? null,
            })),
          });
        }
      }

      // NOT_STARTED → IN_PROGRESS on first edit
      if (stage.status === StageStatus.NOT_STARTED) {
        await tx.projectStage.update({
          where: { id: stage.id },
          data: { status: StageStatus.IN_PROGRESS, actualStart: new Date(), picId: actor.id },
        });
      }

      await this.audit.log(
        {
          entityType: 'InitiatingForm',
          entityId: form.id,
          action: AuditAction.UPDATE,
          projectId,
          actor,
          reason: dto.reason ?? null,
          ipAddress: ip,
        },
        tx,
      );
    });

    await this.recomputeCompletion(stage.id);
    return this.get(projectId);
  }

  async updateChecklist(projectId: string, itemId: string, dto: ChecklistUpdateDto, actor: RequestUser, ip?: string) {
    const stage = await this.getStage(projectId);
    if (stage.status === StageStatus.APPROVED && !dto.reason) {
      throw new BadRequestException('Perubahan checklist pada tahap Approved memerlukan alasan.');
    }
    const item = await this.prisma.initiatingChecklist.findFirst({ where: { id: itemId, stageId: stage.id } });
    if (!item) throw new NotFoundException('Item checklist tidak ditemukan.');

    await this.prisma.initiatingChecklist.update({
      where: { id: itemId },
      data: {
        isChecked: dto.isChecked ?? undefined,
        notes: dto.notes ?? undefined,
        attachmentUrl: dto.attachmentUrl ?? undefined,
        checkedAt: dto.isChecked ? new Date() : dto.isChecked === false ? null : undefined,
        responsibleId: dto.isChecked ? actor.id : undefined,
      },
    });
    await this.recomputeCompletion(stage.id);
    return this.get(projectId);
  }

  async submit(projectId: string, actor: RequestUser, ip?: string) {
    const stage = await this.getStage(projectId);
    if (stage.status === StageStatus.APPROVED) {
      throw new BadRequestException('Tahap Initiating sudah disetujui.');
    }
    if (stage.status === StageStatus.SUBMITTED) {
      throw new BadRequestException('Tahap Initiating sudah diajukan, menunggu persetujuan.');
    }
    const state = await this.get(projectId);
    if (!state.canSubmit) {
      throw new BadRequestException(`Belum lengkap: ${state.missing.join('; ')}.`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.projectStage.update({
        where: { id: stage.id },
        data: { status: StageStatus.SUBMITTED, rejectionReason: null },
      });
      await this.audit.log(
        { entityType: 'ProjectStage', entityId: stage.id, action: AuditAction.UPDATE, projectId, actor, newValue: { status: 'SUBMITTED' }, ipAddress: ip },
        tx,
      );
    });
    return this.get(projectId);
  }

  async approve(projectId: string, actor: RequestUser, ip?: string) {
    const stage = await this.getStage(projectId);
    if (stage.status !== StageStatus.SUBMITTED) {
      throw new BadRequestException('Hanya tahap berstatus "Diajukan" yang bisa disetujui.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.projectStage.update({
        where: { id: stage.id },
        data: {
          status: StageStatus.APPROVED,
          completionPct: 100,
          approvedById: actor.id,
          approvedAt: new Date(),
          actualEnd: new Date(),
          rejectionReason: null,
        },
      });
      await this.audit.log(
        { entityType: 'ProjectStage', entityId: stage.id, action: AuditAction.APPROVE, projectId, actor, newValue: { status: 'APPROVED' }, ipAddress: ip },
        tx,
      );
    });
    return this.get(projectId);
  }

  async reject(projectId: string, dto: RejectDto, actor: RequestUser, ip?: string) {
    const stage = await this.getStage(projectId);
    if (stage.status !== StageStatus.SUBMITTED) {
      throw new BadRequestException('Hanya tahap berstatus "Diajukan" yang bisa ditolak.');
    }
    await this.prisma.$transaction(async (tx) => {
      // PRD §7.2.2: ditolak → kembali ke In Progress, alasan tampil di banner
      await tx.projectStage.update({
        where: { id: stage.id },
        data: { status: StageStatus.IN_PROGRESS, rejectionReason: dto.reason },
      });
      await this.audit.log(
        { entityType: 'ProjectStage', entityId: stage.id, action: AuditAction.REJECT, projectId, actor, reason: dto.reason, ipAddress: ip },
        tx,
      );
    });
    return this.get(projectId);
  }
}
