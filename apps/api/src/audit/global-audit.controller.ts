import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditAction, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/auth/roles.decorator';

class ListGlobalAuditDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 50;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() projectId?: string;
  /** Free-text over actor name and reason. */
  @IsOptional() @IsString() search?: string;
}

/** Admin-wide audit trail across every project (§10). */
@Controller('audit')
export class GlobalAuditController {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(q: ListGlobalAuditDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (q.entityType) where.entityType = q.entityType;
    if (q.action && q.action in AuditAction) where.action = q.action as AuditAction;
    if (q.projectId) where.projectId = q.projectId;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { reason: { contains: s, mode: 'insensitive' } },
        { actor: { is: { name: { contains: s, mode: 'insensitive' } } } },
      ];
    }
    return where;
  }

  /** All matching rows (capped) for CSV export — same filters, no pagination. */
  @Get('export')
  @Roles(Role.ADMIN)
  async export(@Query() q: ListGlobalAuditDto) {
    const rows = await this.prisma.auditLog.findMany({
      where: this.buildWhere(q),
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        actor: { select: { name: true, role: true } },
        project: { select: { code: true, name: true } },
      },
    });
    return {
      data: rows.map((r) => ({
        createdAt: r.createdAt,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        project: r.project ? `${r.project.code} — ${r.project.name}` : '',
        actor: r.actor?.name ?? 'Sistem',
        actorRole: r.actor?.role ?? '',
        reason: r.reason ?? '',
        changes: r.newValue ? JSON.stringify(r.newValue) : '',
        ipAddress: r.ipAddress ?? '',
      })),
      capped: rows.length >= 5000,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  async list(@Query() q: ListGlobalAuditDto) {
    const where = this.buildWhere(q);

    const [total, rows, entityTypeRows, projectRows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          actor: { select: { id: true, name: true, role: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.auditLog.findMany({ select: { entityType: true }, distinct: ['entityType'], orderBy: { entityType: 'asc' } }),
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'desc' },
        take: 200,
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        actor: r.actor,
        project: r.project,
        reason: r.reason,
        oldValue: r.oldValue,
        newValue: r.newValue,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize),
      entityTypes: entityTypeRows.map((x) => x.entityType),
      projects: projectRows,
    };
  }
}
