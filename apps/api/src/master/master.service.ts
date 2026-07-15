import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { MASTER_REGISTRY, MasterConfig } from './master.registry';

@Injectable()
export class MasterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private config(entity: string): MasterConfig {
    const cfg = MASTER_REGISTRY[entity];
    if (!cfg) throw new NotFoundException(`Entitas master "${entity}" tidak dikenali.`);
    return cfg;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private delegate(cfg: MasterConfig): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any)[cfg.delegate];
  }

  /** Keep only registered fields, coercing to their declared types. */
  private sanitize(cfg: MasterConfig, body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, type] of Object.entries(cfg.fields)) {
      if (!(key in body)) continue;
      const raw = body[key];
      if (raw === '' || raw === null || raw === undefined) {
        // enum columns are non-nullable with a DB default → omit so the default
        // applies. numeric/boolean → 0/false. string/reference → null (nullable).
        if (type === 'enum') continue;
        if (type === 'number') out[key] = 0;
        else if (type === 'boolean') out[key] = false;
        else out[key] = null;
        continue;
      }
      if (type === 'number') {
        const n = Number(raw);
        out[key] = Number.isNaN(n) ? 0 : n;
      } else if (type === 'boolean') {
        out[key] = raw === true || raw === 'true';
      } else {
        out[key] = String(raw);
      }
    }
    return out;
  }

  async list(entity: string, query: { page?: number; pageSize?: number; search?: string }) {
    const cfg = this.config(entity);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = cfg.search.map((f) => ({ [f]: { contains: query.search, mode: 'insensitive' } }));
    }

    const delegate = this.delegate(cfg);
    const [total, data] = await this.prisma.$transaction([
      delegate.count({ where }),
      delegate.findMany({
        where,
        include: cfg.include,
        orderBy: cfg.orderBy ?? { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async create(entity: string, body: Record<string, unknown>, actor: RequestUser) {
    const cfg = this.config(entity);
    const data = this.sanitize(cfg, body);
    for (const req of cfg.required) {
      if (data[req] == null || data[req] === '') {
        throw new BadRequestException(`Field "${req}" wajib diisi.`);
      }
    }
    const created = await this.delegate(cfg).create({ data, include: cfg.include });
    await this.audit.log({ entityType: cfg.delegate, entityId: created.id, action: AuditAction.CREATE, actor, newValue: data });
    return created;
  }

  async update(entity: string, id: string, body: Record<string, unknown>, actor: RequestUser) {
    const cfg = this.config(entity);
    const existing = await this.delegate(cfg).findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Data tidak ditemukan.');
    const data = this.sanitize(cfg, body);
    const updated = await this.delegate(cfg).update({ where: { id }, data, include: cfg.include });
    await this.audit.log({ entityType: cfg.delegate, entityId: id, action: AuditAction.UPDATE, actor, newValue: data });
    return updated;
  }

  async remove(entity: string, id: string, actor: RequestUser) {
    const cfg = this.config(entity);
    const existing = await this.delegate(cfg).findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Data tidak ditemukan.');
    await this.delegate(cfg).update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ entityType: cfg.delegate, entityId: id, action: AuditAction.DELETE, actor });
    return { id, deleted: true };
  }
}
