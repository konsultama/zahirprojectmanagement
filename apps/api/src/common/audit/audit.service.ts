import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../auth/current-user.middleware';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  projectId?: string | null;
  actor?: RequestUser;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Write one audit row. Accepts an optional transaction client. */
  async log(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        projectId: entry.projectId ?? null,
        actorId: entry.actor?.id ?? null,
        oldValue: (entry.oldValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        newValue: (entry.newValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        reason: entry.reason ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  }
}
