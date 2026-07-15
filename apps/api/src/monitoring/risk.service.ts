import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, RiskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { CreateRiskDto, UpdateRiskDto } from './dto/monitoring.dto';

/** Risk score band (§7.2.5 C): green 1–6, yellow 8–12, red 15–25. */
function band(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 15) return 'red';
  if (score >= 8) return 'yellow';
  return 'green';
}

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private shape(r: {
    id: string; code: string; description: string; category: string; likelihood: number; impact: number;
    score: number; mitigationStrategy: string | null; mitigationPlan: string | null; ownerId: string | null;
    status: RiskStatus; affectedWbsIds: Prisma.JsonValue;
  }) {
    return { ...r, band: band(r.score), affectedWbsIds: (r.affectedWbsIds as string[] | null) ?? [] };
  }

  async list(projectId: string) {
    const rows = await this.prisma.projectRisk.findMany({
      where: { projectId },
      orderBy: [{ score: 'desc' }, { code: 'asc' }],
      include: { owner: { select: { id: true, name: true } } },
    });
    return rows.map((r) => ({ ...this.shape(r), owner: r.owner }));
  }

  private async nextCode(projectId: string): Promise<string> {
    const last = await this.prisma.projectRisk.findFirst({
      where: { projectId },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let seq = 1;
    if (last) {
      const parsed = Number.parseInt(last.code.replace(/\D/g, ''), 10);
      if (!Number.isNaN(parsed)) seq = parsed + 1;
    }
    return `RSK-${String(seq).padStart(3, '0')}`;
  }

  async create(projectId: string, dto: CreateRiskDto, actor: RequestUser, ip?: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan.');

    const code = await this.nextCode(projectId);
    const score = dto.likelihood * dto.impact;
    const risk = await this.prisma.projectRisk.create({
      data: {
        projectId,
        code,
        description: dto.description,
        category: dto.category,
        likelihood: dto.likelihood,
        impact: dto.impact,
        score,
        mitigationStrategy: dto.mitigationStrategy ?? null,
        mitigationPlan: dto.mitigationPlan ?? null,
        ownerId: dto.ownerId ?? null,
        affectedWbsIds: dto.affectedWbsIds ?? [],
      },
    });
    await this.audit.log({ entityType: 'ProjectRisk', entityId: risk.id, action: AuditAction.CREATE, projectId, actor, newValue: { code, score }, ipAddress: ip });
    return this.list(projectId);
  }

  async update(projectId: string, id: string, dto: UpdateRiskDto, actor: RequestUser, ip?: string) {
    const existing = await this.prisma.projectRisk.findFirst({ where: { id, projectId } });
    if (!existing) throw new NotFoundException('Risiko tidak ditemukan.');
    const likelihood = dto.likelihood ?? existing.likelihood;
    const impact = dto.impact ?? existing.impact;
    await this.prisma.projectRisk.update({
      where: { id },
      data: {
        description: dto.description ?? undefined,
        category: dto.category ?? undefined,
        likelihood,
        impact,
        score: likelihood * impact,
        mitigationStrategy: dto.mitigationStrategy ?? undefined,
        mitigationPlan: dto.mitigationPlan ?? undefined,
        ownerId: dto.ownerId ?? undefined,
        status: dto.status ?? undefined,
        affectedWbsIds: dto.affectedWbsIds ?? undefined,
      },
    });
    await this.audit.log({ entityType: 'ProjectRisk', entityId: id, action: AuditAction.UPDATE, projectId, actor, ipAddress: ip });
    return this.list(projectId);
  }

  async remove(projectId: string, id: string, actor: RequestUser, ip?: string) {
    const existing = await this.prisma.projectRisk.findFirst({ where: { id, projectId } });
    if (!existing) throw new NotFoundException('Risiko tidak ditemukan.');
    await this.prisma.projectRisk.delete({ where: { id } });
    await this.audit.log({ entityType: 'ProjectRisk', entityId: id, action: AuditAction.DELETE, projectId, actor, ipAddress: ip });
    return this.list(projectId);
  }
}
