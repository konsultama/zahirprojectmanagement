import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class ListAuditDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 50;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() action?: string;
}

@Controller('projects/:projectId/audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Param('projectId') projectId: string, @Query() q: ListAuditDto) {
    const where: Prisma.AuditLogWhereInput = { projectId };
    if (q.entityType) where.entityType = q.entityType;
    if (q.action && q.action in AuditAction) where.action = q.action as AuditAction;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { actor: { select: { id: true, name: true, role: true } } },
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        actor: r.actor,
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
      // distinct entity types present, for the filter dropdown
      entityTypes: [...new Set((await this.prisma.auditLog.findMany({ where: { projectId }, select: { entityType: true }, distinct: ['entityType'] })).map((x) => x.entityType))],
    };
  }
}
