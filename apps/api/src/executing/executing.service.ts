import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ExecutionStatus, Prisma, StageStatus, StageType, WbsItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { CostActualDto, UpdateExecutionDto } from './dto/executing.dto';

const money = (n: number) => Math.round(n * 100) / 100;
const pct2 = (n: number) => Math.round(n * 100) / 100;
const num = (d: Prisma.Decimal | null | undefined): number => (d == null ? 0 : Number(d));

@Injectable()
export class ExecutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getProject(projectId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { stages: true, locations: { where: { deletedAt: null } } },
    });
    if (!p) throw new NotFoundException('Proyek tidak ditemukan.');
    return p;
  }

  private planningApproved(project: { stages: { stageType: StageType; status: StageStatus }[] }): boolean {
    return project.stages.some((s) => s.stageType === StageType.PLANNING && s.status === StageStatus.APPROVED);
  }

  /** Ensure every approved-Planning leaf mirrors into an execution_record (§7.2.4 A). */
  private async ensureMirror(projectId: string): Promise<void> {
    const leaves = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP }, execution: null },
      select: { id: true, picId: true },
    });
    if (leaves.length > 0) {
      await this.prisma.executionRecord.createMany({
        data: leaves.map((l) => ({ wbsItemId: l.id, picId: l.picId, status: ExecutionStatus.NOT_STARTED })),
      });
    }
  }

  /**
   * Rollup progress (§8.1) & actual cost (§8.2) and persist on the project.
   * Progress: budget-weighted per location, then weighted by location weight.
   */
  private async recompute(tx: Prisma.TransactionClient, projectId: string): Promise<{ progress: number; actualCost: number }> {
    const locations = await tx.projectLocation.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, weightPct: true },
    });
    const leaves = await tx.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP } },
      select: {
        locationId: true,
        totalBudget: true,
        execution: { select: { progressPct: true, actualCost: true, status: true } },
      },
    });

    // per-location budget-weighted progress
    const byLoc = new Map<string, { wsum: number; wprog: number }>();
    let actualCost = 0;
    for (const leaf of leaves) {
      const exec = leaf.execution;
      if (!exec || exec.status === ExecutionStatus.CANCELLED) continue;
      actualCost += num(exec.actualCost);
      const budget = num(leaf.totalBudget);
      const prog = num(exec.progressPct);
      const acc = byLoc.get(leaf.locationId) ?? { wsum: 0, wprog: 0 };
      acc.wsum += budget;
      acc.wprog += budget * prog;
      byLoc.set(leaf.locationId, acc);
    }

    let projectProgress = 0;
    let totalLocWeight = 0;
    for (const loc of locations) {
      const w = num(loc.weightPct);
      const acc = byLoc.get(loc.id);
      const locProgress = acc && acc.wsum > 0 ? acc.wprog / acc.wsum : 0;
      projectProgress += locProgress * w;
      totalLocWeight += w;
    }
    projectProgress = totalLocWeight > 0 ? projectProgress / totalLocWeight : 0;

    const progress = pct2(projectProgress);
    const cost = money(actualCost);
    await tx.project.update({ where: { id: projectId }, data: { progressPct: progress, actualCost: cost } });
    return { progress, actualCost: cost };
  }

  // ---- read -------------------------------------------------------------

  async list(projectId: string) {
    const project = await this.getProject(projectId);
    const locked = !this.planningApproved(project);
    if (locked) {
      return { locked: true, rows: [], summary: this.summary(project, 0) };
    }
    await this.ensureMirror(projectId);

    const leaves = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP } },
      orderBy: [{ wbsNumber: 'asc' }],
      include: {
        location: { select: { name: true } },
        pic: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        execution: {
          include: {
            costActuals: { orderBy: { date: 'desc' } },
            pic: { select: { id: true, name: true } },
          },
        },
      },
    });

    const rows = leaves.map((l) => {
      const e = l.execution;
      const planBudget = num(l.totalBudget);
      const actualCost = num(e?.actualCost);
      return {
        wbsItemId: l.id,
        wbsNumber: l.wbsNumber,
        name: l.name,
        itemType: l.itemType,
        location: l.location?.name ?? null,
        uom: l.uom,
        planQty: num(l.qty),
        planBudget,
        // realization
        executionId: e?.id ?? null,
        actualQty: e ? num(e.actualQty) : 0,
        progressPct: e ? num(e.progressPct) : 0,
        actualCost,
        sisaAnggaran: money(planBudget - actualCost),
        variansPct: planBudget > 0 ? pct2(((actualCost - planBudget) / planBudget) * 100) : 0,
        isOverBudget: actualCost > planBudget,
        isCompleted: e?.isCompleted ?? false,
        status: e?.status ?? ExecutionStatus.NOT_STARTED,
        actualStart: e?.actualStart ?? null,
        actualEnd: e?.actualEnd ?? null,
        pic: e?.pic ?? l.pic,
        vendor: l.vendor,
        costActuals: (e?.costActuals ?? []).map((c) => ({
          id: c.id,
          date: c.date,
          description: c.description,
          amount: num(c.amount),
          referenceNo: c.referenceNo,
          attachmentUrl: c.attachmentUrl,
        })),
      };
    });

    return { locked: false, rows, summary: this.summary(project, project.allowOverbudget ? 1 : 0) };
  }

  private summary(project: { progressPct: Prisma.Decimal; totalBudget: Prisma.Decimal; actualCost: Prisma.Decimal; allowOverbudget: boolean; overbudgetTolerancePct: Prisma.Decimal | null }, _f: number) {
    const total = num(project.totalBudget);
    const cost = num(project.actualCost);
    return {
      progressPct: num(project.progressPct),
      totalBudget: total,
      actualCost: cost,
      sisaAnggaran: money(total - cost),
      serapanPct: total > 0 ? pct2((cost / total) * 100) : 0,
      allowOverbudget: project.allowOverbudget,
      overbudgetTolerancePct: project.overbudgetTolerancePct == null ? null : num(project.overbudgetTolerancePct),
    };
  }

  // ---- update realization ----------------------------------------------

  async update(projectId: string, wbsItemId: string, dto: UpdateExecutionDto, actor: RequestUser, ip?: string) {
    const project = await this.getProject(projectId);
    if (!this.planningApproved(project)) {
      throw new BadRequestException('Planning harus Approved sebelum Executing bisa diisi.');
    }
    const leaf = await this.prisma.wbsItem.findFirst({
      where: { id: wbsItemId, projectId, deletedAt: null },
      include: { execution: true },
    });
    if (!leaf || !leaf.execution) throw new NotFoundException('Baris Executing tidak ditemukan.');
    const exec = leaf.execution;

    let progressPct = dto.progressPct ?? num(exec.progressPct);

    // Material: auto % from qty (§7.2.4 C) unless % explicitly provided
    if (leaf.itemType === WbsItemType.MATERIAL && dto.actualQty != null && dto.progressPct == null) {
      const planQty = num(leaf.qty);
      progressPct = planQty > 0 ? Math.min(100, pct2((dto.actualQty / planQty) * 100)) : 0;
    }

    let isCompleted = dto.isCompleted ?? exec.isCompleted;
    if (dto.isCompleted === true) {
      // Checking "Selesai" completes the row to 100% (§7.2.4 C). A reason is only
      // required for deliberate early termination — i.e. the caller explicitly
      // sends a % below 100 together with isCompleted.
      if (dto.progressPct != null && dto.progressPct < 100) {
        if (!dto.reason) throw new BadRequestException('Menandai Selesai saat % < 100 memerlukan alasan.');
        progressPct = dto.progressPct;
      } else {
        progressPct = 100;
      }
    } else if (dto.isCompleted === false || (progressPct < 100 && exec.isCompleted)) {
      // unchecking, or lowering progress below 100, clears completion
      isCompleted = false;
    }

    // derive status from completion + progress unless explicitly set
    let status = dto.status ?? exec.status;
    if (dto.status == null) {
      if (isCompleted) status = ExecutionStatus.DONE;
      else if (status !== ExecutionStatus.BLOCKED && status !== ExecutionStatus.CANCELLED) {
        status = progressPct > 0 ? ExecutionStatus.IN_PROGRESS : ExecutionStatus.NOT_STARTED;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.executionRecord.update({
        where: { id: exec.id },
        data: {
          actualQty: dto.actualQty ?? undefined,
          progressPct,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedById: isCompleted ? actor.id : null,
          status,
          actualStart: dto.actualStart ? new Date(dto.actualStart) : undefined,
          actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : undefined,
          picId: dto.picId ?? undefined,
        },
      });
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'ExecutionRecord', entityId: exec.id, action: AuditAction.UPDATE, projectId, actor, newValue: { progressPct, status }, reason: dto.reason ?? null, ipAddress: ip },
        tx,
      );
    });
    return this.list(projectId);
  }

  // ---- cost records -----------------------------------------------------

  async addCost(projectId: string, wbsItemId: string, dto: CostActualDto, actor: RequestUser, ip?: string) {
    const project = await this.getProject(projectId);
    const leaf = await this.prisma.wbsItem.findFirst({
      where: { id: wbsItemId, projectId, deletedAt: null },
      include: { execution: { include: { costActuals: true } } },
    });
    if (!leaf || !leaf.execution) throw new NotFoundException('Baris Executing tidak ditemukan.');
    const exec = leaf.execution;

    const planBudget = num(leaf.totalBudget);
    const currentCost = exec.costActuals.reduce((s, c) => s + num(c.amount), 0);
    const newCost = currentCost + dto.amount;

    // Per-row overbudget rule (§7.2.4 C, §8.3)
    if (newCost > planBudget) {
      if (!project.allowOverbudget) {
        throw new BadRequestException(
          `Realisasi biaya (Rp ${money(newCost).toLocaleString('id-ID')}) melebihi anggaran baris (Rp ${planBudget.toLocaleString('id-ID')}). Aktifkan "Izinkan Overbudget" atau revisi Planning.`,
        );
      }
      const tol = project.overbudgetTolerancePct == null ? 0 : num(project.overbudgetTolerancePct);
      const ceiling = planBudget * (1 + tol / 100);
      if (newCost > ceiling) {
        throw new BadRequestException(`Realisasi melampaui batas toleransi overbudget (${tol}%) untuk baris ini.`);
      }
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Realisasi melebihi anggaran baris memerlukan alasan.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.costActual.create({
        data: {
          executionRecordId: exec.id,
          date: new Date(dto.date),
          description: dto.description,
          amount: dto.amount,
          referenceNo: dto.referenceNo ?? null,
          attachmentUrl: dto.attachmentUrl ?? null,
          createdBy: actor.id,
        },
      });
      await tx.executionRecord.update({ where: { id: exec.id }, data: { actualCost: money(newCost) } });
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'CostActual', entityId: exec.id, action: AuditAction.CREATE, projectId, actor, newValue: { amount: dto.amount, ref: dto.referenceNo }, reason: dto.reason ?? null, ipAddress: ip },
        tx,
      );
    });
    return this.list(projectId);
  }

  async deleteCost(projectId: string, costId: string, actor: RequestUser, ip?: string) {
    await this.getProject(projectId);
    const cost = await this.prisma.costActual.findFirst({
      where: { id: costId, executionRecord: { wbsItem: { projectId } } },
      include: { executionRecord: { include: { costActuals: true } } },
    });
    if (!cost) throw new NotFoundException('Catatan biaya tidak ditemukan.');
    const exec = cost.executionRecord;
    const remaining = exec.costActuals.filter((c) => c.id !== costId).reduce((s, c) => s + num(c.amount), 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.costActual.delete({ where: { id: costId } });
      await tx.executionRecord.update({ where: { id: exec.id }, data: { actualCost: money(remaining) } });
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'CostActual', entityId: costId, action: AuditAction.DELETE, projectId, actor, ipAddress: ip },
        tx,
      );
    });
    return this.list(projectId);
  }
}
