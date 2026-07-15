import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ExecutionStatus, Prisma, QcStatus, Role, StageStatus, StageType, WbsItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { UpdateQcDto } from './dto/monitoring.dto';

const num = (d: Prisma.Decimal | null | undefined): number => (d == null ? 0 : Number(d));
const pct2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getProject(projectId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { stages: true },
    });
    if (!p) throw new NotFoundException('Proyek tidak ditemukan.');
    return p;
  }

  private planningApproved(p: { stages: { stageType: StageType; status: StageStatus }[] }): boolean {
    return p.stages.some((s) => s.stageType === StageType.PLANNING && s.status === StageStatus.APPROVED);
  }

  private async ensureQc(projectId: string): Promise<void> {
    const leaves = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP }, qc: null },
      select: { id: true },
    });
    if (leaves.length > 0) {
      await this.prisma.qcRecord.createMany({
        data: leaves.map((l) => ({ wbsItemId: l.id, qcStatus: QcStatus.BELUM_DIPERIKSA })),
      });
    }
  }

  // ---- QC list ----------------------------------------------------------

  async qcList(projectId: string) {
    const project = await this.getProject(projectId);
    if (!this.planningApproved(project)) {
      return { locked: true, rows: [], counts: {} };
    }
    await this.ensureQc(projectId);

    const leaves = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP } },
      orderBy: { wbsNumber: 'asc' },
      include: {
        location: { select: { name: true } },
        execution: { select: { progressPct: true, status: true } },
        qc: { include: { inspector: { select: { id: true, name: true } } } },
      },
    });

    const rows = leaves.map((l) => {
      const progress = num(l.execution?.progressPct);
      return {
        wbsItemId: l.id,
        wbsNumber: l.wbsNumber,
        name: l.name,
        location: l.location?.name ?? null,
        isQcRequired: l.isQcRequired,
        progressPct: progress,
        executionStatus: l.execution?.status ?? ExecutionStatus.NOT_STARTED,
        inspectable: progress >= 100 || l.execution?.status === ExecutionStatus.DONE,
        qcStatus: l.qc?.qcStatus ?? QcStatus.BELUM_DIPERIKSA,
        inspectionDate: l.qc?.inspectionDate ?? null,
        inspector: l.qc?.inspector ?? null,
        findings: l.qc?.findings ?? null,
        correctiveAction: l.qc?.correctiveAction ?? null,
        remediationDue: l.qc?.remediationDue ?? null,
        remediationStatus: l.qc?.remediationStatus ?? null,
        notes: l.qc?.notes ?? null,
      };
    });

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.qcStatus] = (counts[r.qcStatus] ?? 0) + 1;

    return { locked: false, rows, counts };
  }

  // ---- QC update --------------------------------------------------------

  async updateQc(projectId: string, wbsItemId: string, dto: UpdateQcDto, actor: RequestUser, ip?: string) {
    await this.getProject(projectId);
    const leaf = await this.prisma.wbsItem.findFirst({
      where: { id: wbsItemId, projectId, deletedAt: null },
      include: { qc: true, execution: true },
    });
    if (!leaf || !leaf.qc) throw new NotFoundException('Baris QC tidak ditemukan.');

    const progress = num(leaf.execution?.progressPct);
    const done = progress >= 100 || leaf.execution?.status === ExecutionStatus.DONE;
    if (dto.qcStatus !== QcStatus.BELUM_DIPERIKSA && !done) {
      throw new BadRequestException('Baris hanya bisa diperiksa jika % pengerjaan ≥ 100 atau berstatus Done.');
    }

    // validation per target status (§7.2.5 A)
    if (dto.qcStatus === QcStatus.FAILED) {
      if (!dto.findings?.trim()) throw new BadRequestException('Catatan temuan wajib diisi untuk status Failed.');
      if (!dto.correctiveAction?.trim()) throw new BadRequestException('Tindakan korektif wajib diisi untuk status Failed.');
    }
    if (dto.qcStatus === QcStatus.PERLU_PERBAIKAN) {
      if (!dto.findings?.trim()) throw new BadRequestException('Catatan temuan wajib diisi untuk "Perlu Perbaikan".');
      if (!dto.remediationDue) throw new BadRequestException('Batas waktu perbaikan wajib diisi.');
    }
    if (dto.qcStatus === QcStatus.WAIVED) {
      if (actor.role !== Role.ADMIN) throw new ForbiddenException('Status Waived hanya boleh diberikan Admin.');
      if (!dto.reason?.trim()) throw new BadRequestException('Alasan wajib diisi untuk Waived.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.qcRecord.update({
        where: { id: leaf.qc!.id },
        data: {
          qcStatus: dto.qcStatus,
          inspectionDate: dto.qcStatus === QcStatus.BELUM_DIPERIKSA ? null : new Date(),
          inspectorId: dto.qcStatus === QcStatus.BELUM_DIPERIKSA ? null : actor.id,
          findings: dto.findings ?? undefined,
          correctiveAction: dto.correctiveAction ?? undefined,
          remediationDue: dto.remediationDue ? new Date(dto.remediationDue) : undefined,
          remediationStatus:
            dto.remediationStatus ?? (dto.qcStatus === QcStatus.PERLU_PERBAIKAN ? 'OPEN' : undefined),
          notes: dto.qcStatus === QcStatus.WAIVED ? (dto.reason ?? dto.notes ?? null) : dto.notes ?? undefined,
        },
      });

      // Failed → related Executing row back to In Progress, uncheck Selesai (§7.2.5 B)
      if (dto.qcStatus === QcStatus.FAILED && leaf.execution) {
        await tx.executionRecord.update({
          where: { id: leaf.execution.id },
          data: { status: ExecutionStatus.IN_PROGRESS, isCompleted: false, completedAt: null, completedById: null },
        });
      }

      // stage progress: % of required-QC rows resolved
      await this.updateStageCompletion(tx, projectId);

      await this.audit.log(
        { entityType: 'QcRecord', entityId: leaf.qc!.id, action: AuditAction.UPDATE, projectId, actor, newValue: { qcStatus: dto.qcStatus }, reason: dto.reason ?? null, ipAddress: ip },
        tx,
      );
    });

    return this.qcList(projectId);
  }

  private async updateStageCompletion(tx: Prisma.TransactionClient, projectId: string): Promise<void> {
    const required = await tx.wbsItem.findMany({
      where: { projectId, deletedAt: null, isQcRequired: true },
      select: { qc: { select: { qcStatus: true } } },
    });
    const stage = await tx.projectStage.findFirst({ where: { projectId, stageType: StageType.MONITORING } });
    if (!stage) return;
    if (required.length === 0) {
      await tx.projectStage.update({ where: { id: stage.id }, data: { status: StageStatus.IN_PROGRESS } });
      return;
    }
    const resolved = required.filter(
      (r) => r.qc && (r.qc.qcStatus === QcStatus.PASSED || r.qc.qcStatus === QcStatus.WAIVED),
    ).length;
    const pct = pct2((resolved / required.length) * 100);
    await tx.projectStage.update({
      where: { id: stage.id },
      data: {
        completionPct: pct,
        status: pct >= 100 ? StageStatus.APPROVED : StageStatus.IN_PROGRESS,
      },
    });
  }

  // ---- control dashboard (§7.2.5 D) ------------------------------------

  async dashboard(projectId: string) {
    const project = await this.getProject(projectId);
    const totalBudget = num(project.totalBudget);
    const actualCost = num(project.actualCost);
    const actualProgress = num(project.progressPct);

    // planned progress = time-elapsed ratio (linear) between start & finish
    const start = project.startDate.getTime();
    const finish = project.finishDate.getTime();
    const now = Date.now();
    const plannedProgress =
      finish <= start ? 100 : pct2(Math.max(0, Math.min(1, (now - start) / (finish - start))) * 100);

    const spi = plannedProgress > 0 ? pct2(actualProgress / plannedProgress) : null;
    const earned = (actualProgress / 100) * totalBudget;
    const cpi = actualCost > 0 ? pct2(earned / actualCost) : null;

    // QC summary
    const qc = await this.prisma.qcRecord.groupBy({
      by: ['qcStatus'],
      where: { wbsItem: { projectId, deletedAt: null } },
      _count: true,
    });
    const qcSummary: Record<string, number> = {};
    for (const g of qc) qcSummary[g.qcStatus] = g._count;

    // leaf rows for top lists
    const leaves = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP } },
      include: { execution: { select: { progressPct: true, actualCost: true } } },
    });
    const withMetrics = leaves.map((l) => {
      const prog = num(l.execution?.progressPct);
      const cost = num(l.execution?.actualCost);
      const plan = num(l.totalBudget);
      return {
        wbsNumber: l.wbsNumber,
        name: l.name,
        progressPct: prog,
        delay: pct2(plannedProgress - prog), // positive = behind schedule
        planBudget: plan,
        actualCost: cost,
        costOver: pct2(cost - plan), // positive = over budget
      };
    });
    const topDelayed = [...withMetrics].filter((r) => r.delay > 0).sort((a, b) => b.delay - a.delay).slice(0, 5);
    const topOver = [...withMetrics].filter((r) => r.costOver > 0).sort((a, b) => b.costOver - a.costOver).slice(0, 5);

    const light = (v: number | null) => (v == null ? 'na' : v < 0.9 ? 'red' : v < 1.0 ? 'yellow' : 'green');

    return {
      progress: { actual: actualProgress, planned: plannedProgress },
      evm: { spi, cpi, spiLight: light(spi), cpiLight: light(cpi) },
      budget: { totalBudget, actualCost, earned: Math.round(earned), serapanPct: totalBudget > 0 ? pct2((actualCost / totalBudget) * 100) : 0 },
      qcSummary,
      topDelayed,
      topOver,
    };
  }
}
