import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QcStatus, Role, StageStatus, StageType, WbsItemType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/auth/current-user.middleware';

const num = (d: Prisma.Decimal | null | undefined): number => (d == null ? 0 : Number(d));
const pct2 = (n: number) => Math.round(n * 100) / 100;
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const RESTRICTED: Role[] = [Role.PM, Role.SUPERVISOR, Role.QC];

const STAGE_ORDER: StageType[] = [
  StageType.INITIATING,
  StageType.PLANNING,
  StageType.EXECUTING,
  StageType.MONITORING,
  StageType.CLOSING,
];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Data-scope: PM/Supervisor/QC only see projects they are assigned to (§6). */
  private scope(actor?: RequestUser): Prisma.ProjectWhereInput {
    if (actor && RESTRICTED.includes(actor.role as Role)) {
      return { OR: [{ picId: actor.id }, { members: { some: { userId: actor.id } } }] };
    }
    return {};
  }

  async run(key: string, actor?: RequestUser) {
    switch (key) {
      case 'portfolio':
        return this.portfolio(actor);
      case 'budget':
        return this.budget(actor);
      case 'schedule':
        return this.schedule(actor);
      case 'qc':
        return this.qc(actor);
      case 'risk':
        return this.risk(actor);
      default:
        throw new NotFoundException(`Laporan "${key}" tidak dikenali.`);
    }
  }

  // 1) Portofolio Proyek
  private async portfolio(actor?: RequestUser) {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, ...this.scope(actor) },
      orderBy: { code: 'asc' },
      include: {
        client: { select: { name: true } },
        pic: { select: { name: true } },
        stages: { select: { stageType: true, status: true } },
      },
    });
    const rows = projects.map((p) => {
      const ordered = [...p.stages].sort((a, b) => STAGE_ORDER.indexOf(a.stageType) - STAGE_ORDER.indexOf(b.stageType));
      const active = ordered.find((s) => s.status !== StageStatus.APPROVED) ?? ordered[ordered.length - 1];
      const total = num(p.totalBudget);
      const actual = num(p.actualCost);
      return {
        code: p.code,
        name: p.name,
        client: p.client?.name ?? '—',
        pic: p.pic?.name ?? '—',
        status: p.status,
        stage: active?.stageType ?? '—',
        progressPct: num(p.progressPct),
        totalBudget: total,
        actualCost: actual,
        serapanPct: total > 0 ? pct2((actual / total) * 100) : 0,
      };
    });
    return {
      rows,
      summary: {
        count: rows.length,
        totalBudget: rows.reduce((s, r) => s + r.totalBudget, 0),
        totalActual: rows.reduce((s, r) => s + r.actualCost, 0),
        avgProgress: rows.length ? pct2(rows.reduce((s, r) => s + r.progressPct, 0) / rows.length) : 0,
      },
    };
  }

  // 2) Serapan Anggaran
  private async budget(actor?: RequestUser) {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, ...this.scope(actor) },
      orderBy: { code: 'asc' },
    });
    const rows = projects.map((p) => {
      const estimate = p.initialBudget == null ? 0 : num(p.initialBudget);
      const plan = num(p.totalBudget);
      const actual = num(p.actualCost);
      return {
        code: p.code,
        name: p.name,
        estimate,
        plan,
        actual,
        sisa: pct2(plan - actual),
        variansPct: plan > 0 ? pct2(((actual - plan) / plan) * 100) : 0,
        isOverbudget: p.isOverbudget,
      };
    });
    return {
      rows,
      summary: {
        totalPlan: rows.reduce((s, r) => s + r.plan, 0),
        totalActual: rows.reduce((s, r) => s + r.actual, 0),
        totalSisa: rows.reduce((s, r) => s + r.sisa, 0),
        overbudgetCount: rows.filter((r) => r.isOverbudget).length,
      },
    };
  }

  // 3) Progres & Jadwal (SPI)
  private async schedule(actor?: RequestUser) {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, ...this.scope(actor) },
      orderBy: { code: 'asc' },
    });
    const now = Date.now();
    const rows = projects.map((p) => {
      const start = p.startDate.getTime();
      const finish = p.finishDate.getTime();
      const planned = finish <= start ? 100 : pct2(Math.max(0, Math.min(1, (now - start) / (finish - start))) * 100);
      const actual = num(p.progressPct);
      const spi = planned > 0 ? pct2(actual / planned) : null;
      return {
        code: p.code,
        name: p.name,
        startDate: p.startDate,
        finishDate: p.finishDate,
        sisaHari: days(new Date(), p.finishDate),
        actualProgress: actual,
        plannedProgress: planned,
        spi,
        onSchedule: spi == null || spi >= 0.9,
      };
    });
    return {
      rows,
      summary: {
        late: rows.filter((r) => !r.onSchedule).length,
        onTrack: rows.filter((r) => r.onSchedule).length,
      },
    };
  }

  // 4) Ringkasan QC
  private async qc(actor?: RequestUser) {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, ...this.scope(actor) },
      orderBy: { code: 'asc' },
      include: {
        wbsItems: {
          where: { deletedAt: null, itemType: { not: WbsItemType.GROUP } },
          select: { qc: { select: { qcStatus: true } } },
        },
      },
    });
    const rows = projects.map((p) => {
      const qcs = p.wbsItems.map((w) => w.qc?.qcStatus ?? QcStatus.BELUM_DIPERIKSA);
      const count = (s: QcStatus) => qcs.filter((x) => x === s).length;
      const total = qcs.length;
      const passed = count(QcStatus.PASSED) + count(QcStatus.WAIVED);
      return {
        code: p.code,
        name: p.name,
        total,
        passed,
        failed: count(QcStatus.FAILED),
        perluPerbaikan: count(QcStatus.PERLU_PERBAIKAN),
        belum: count(QcStatus.BELUM_DIPERIKSA),
        passedPct: total > 0 ? pct2((passed / total) * 100) : 0,
      };
    });
    return {
      rows,
      summary: {
        totalItems: rows.reduce((s, r) => s + r.total, 0),
        totalPassed: rows.reduce((s, r) => s + r.passed, 0),
        totalFailed: rows.reduce((s, r) => s + r.failed, 0),
      },
    };
  }

  // 5) Register Risiko (lintas proyek)
  private async risk(actor?: RequestUser) {
    const risks = await this.prisma.projectRisk.findMany({
      where: { project: { deletedAt: null, ...this.scope(actor) } },
      orderBy: [{ score: 'desc' }],
      include: {
        project: { select: { code: true } },
        owner: { select: { name: true } },
      },
    });
    const band = (s: number) => (s >= 15 ? 'Tinggi' : s >= 8 ? 'Sedang' : 'Rendah');
    const rows = risks.map((r) => ({
      projectCode: r.project?.code ?? '—',
      code: r.code,
      description: r.description,
      category: r.category,
      likelihood: r.likelihood,
      impact: r.impact,
      score: r.score,
      level: band(r.score),
      status: r.status,
      owner: r.owner?.name ?? '—',
    }));
    return {
      rows,
      summary: {
        total: rows.length,
        tinggi: rows.filter((r) => r.level === 'Tinggi').length,
        occurred: rows.filter((r) => r.status === 'OCCURRED').length,
      },
    };
  }
}
