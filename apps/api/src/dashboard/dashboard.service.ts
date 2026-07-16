import { Injectable } from '@nestjs/common';
import { Prisma, ProjectStatus, QcStatus, Role, StageStatus, StageType, WbsItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/auth/current-user.middleware';

const num = (d: Prisma.Decimal | null | undefined): number => (d == null ? 0 : Number(d));
const pct2 = (n: number) => Math.round(n * 100) / 100;
const RESTRICTED: Role[] = [Role.PM, Role.SUPERVISOR, Role.QC];
const STAGE_ORDER: StageType[] = [
  StageType.INITIATING,
  StageType.PLANNING,
  StageType.EXECUTING,
  StageType.MONITORING,
  StageType.CLOSING,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(actor?: RequestUser): Prisma.ProjectWhereInput {
    if (actor && RESTRICTED.includes(actor.role as Role)) {
      return { OR: [{ picId: actor.id }, { members: { some: { userId: actor.id } } }] };
    }
    return {};
  }

  async summary(actor?: RequestUser) {
    const where: Prisma.ProjectWhereInput = { deletedAt: null, ...this.scope(actor) };

    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { stages: { select: { stageType: true, status: true } } },
    });

    // leaf QC across scoped projects (for QC summary + per-project failed count)
    const leaves = await this.prisma.wbsItem.findMany({
      where: { deletedAt: null, itemType: { not: WbsItemType.GROUP }, project: where },
      select: { projectId: true, qc: { select: { qcStatus: true } } },
    });
    const qcAgg = { total: 0, passed: 0, failed: 0, perluPerbaikan: 0, belum: 0 };
    const failedByProject = new Map<string, number>();
    for (const l of leaves) {
      const s = l.qc?.qcStatus ?? QcStatus.BELUM_DIPERIKSA;
      qcAgg.total += 1;
      if (s === QcStatus.PASSED || s === QcStatus.WAIVED) qcAgg.passed += 1;
      else if (s === QcStatus.FAILED) {
        qcAgg.failed += 1;
        failedByProject.set(l.projectId, (failedByProject.get(l.projectId) ?? 0) + 1);
      } else if (s === QcStatus.PERLU_PERBAIKAN) qcAgg.perluPerbaikan += 1;
      else qcAgg.belum += 1;
    }

    const [riskTotal, riskHigh] = await Promise.all([
      this.prisma.projectRisk.count({ where: { project: where } }),
      this.prisma.projectRisk.count({ where: { project: where, score: { gte: 15 } } }),
    ]);

    const now = Date.now();
    const statusBreakdown: Record<string, number> = {};
    const stageBreakdown: Record<string, number> = {};
    let totalBudget = 0;
    let totalActual = 0;
    let progressSum = 0;
    let overbudgetCount = 0;
    let lateCount = 0;
    const attention: { code: string; name: string; reasons: string[] }[] = [];
    const budgetRows: { code: string; name: string; plan: number; actual: number; serapanPct: number; progressPct: number }[] = [];

    for (const p of projects) {
      statusBreakdown[p.status] = (statusBreakdown[p.status] ?? 0) + 1;

      const ordered = [...p.stages].sort((a, b) => STAGE_ORDER.indexOf(a.stageType) - STAGE_ORDER.indexOf(b.stageType));
      const active = ordered.find((s) => s.status !== StageStatus.APPROVED) ?? ordered[ordered.length - 1];
      if (active) stageBreakdown[active.stageType] = (stageBreakdown[active.stageType] ?? 0) + 1;

      const plan = num(p.totalBudget);
      const actual = num(p.actualCost);
      const progress = num(p.progressPct);
      totalBudget += plan;
      totalActual += actual;
      progressSum += progress;

      // schedule: planned progress by elapsed time
      const start = p.startDate.getTime();
      const finish = p.finishDate.getTime();
      const planned = finish <= start ? 100 : Math.max(0, Math.min(1, (now - start) / (finish - start))) * 100;
      const isLate = p.status === ProjectStatus.ACTIVE && planned > 0 && progress < planned * 0.9;

      if (p.isOverbudget) overbudgetCount += 1;
      if (isLate) lateCount += 1;

      const reasons: string[] = [];
      if (p.isOverbudget) reasons.push('Overbudget');
      if (isLate) reasons.push('Terlambat');
      const failed = failedByProject.get(p.id) ?? 0;
      if (failed > 0) reasons.push(`${failed} QC gagal`);
      if (reasons.length > 0) attention.push({ code: p.code, name: p.name, reasons });

      budgetRows.push({
        code: p.code,
        name: p.name,
        plan,
        actual,
        serapanPct: plan > 0 ? pct2((actual / plan) * 100) : 0,
        progressPct: progress,
      });
    }

    const count = projects.length;
    return {
      kpi: {
        totalProjects: count,
        activeProjects: statusBreakdown[ProjectStatus.ACTIVE] ?? 0,
        closedProjects: statusBreakdown[ProjectStatus.CLOSED] ?? 0,
        totalBudget,
        totalActual,
        serapanPct: totalBudget > 0 ? pct2((totalActual / totalBudget) * 100) : 0,
        avgProgress: count > 0 ? pct2(progressSum / count) : 0,
        overbudgetCount,
        lateCount,
      },
      statusBreakdown,
      stageBreakdown,
      attention,
      topBudget: budgetRows.sort((a, b) => b.plan - a.plan).slice(0, 5),
      qc: qcAgg,
      risk: { total: riskTotal, high: riskHigh },
    };
  }
}
