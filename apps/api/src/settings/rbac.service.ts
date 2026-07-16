import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { PERMISSIONS, ROLES, ROLE_LABELS } from './rbac.permissions';

@Injectable()
export class RbacService {
  /** In-memory cache of the matrix (key `${role}:${permissionKey}` -> allowed). */
  private cache: Map<string, boolean> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async loadCache(): Promise<void> {
    await this.ensureSeed();
    const rows = await this.prisma.rolePermission.findMany();
    const m = new Map<string, boolean>();
    for (const r of rows) m.set(`${r.role}:${r.permissionKey}`, r.allowed);
    this.cache = m;
  }

  /** Is the role allowed the permission? Consults the DB matrix (cached), falling
   * back to the §6 default when the cell is missing. */
  async isAllowed(role: Role, permissionKey: string): Promise<boolean> {
    if (!this.cache) await this.loadCache();
    const key = `${role}:${permissionKey}`;
    if (this.cache!.has(key)) return this.cache!.get(key)!;
    const def = PERMISSIONS.find((p) => p.key === permissionKey);
    return def ? def.defaults.includes(role) : false;
  }

  /** Lazily seed the §6 default matrix on first access. */
  private async ensureSeed(): Promise<void> {
    const count = await this.prisma.rolePermission.count();
    if (count > 0) return;
    const rows = PERMISSIONS.flatMap((p) =>
      ROLES.map((role) => ({ role, permissionKey: p.key, allowed: p.defaults.includes(role) })),
    );
    await this.prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
  }

  async getMatrix() {
    await this.ensureSeed();
    const rows = await this.prisma.rolePermission.findMany();
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const p of PERMISSIONS) {
      matrix[p.key] = {};
      for (const role of ROLES) {
        const found = rows.find((r) => r.permissionKey === p.key && r.role === role);
        matrix[p.key][role] = found?.allowed ?? p.defaults.includes(role);
      }
    }
    return {
      permissions: PERMISSIONS.map((p) => ({ key: p.key, label: p.label })),
      roles: ROLES.map((r) => ({ key: r, label: ROLE_LABELS[r] })),
      matrix,
    };
  }

  async setCell(role: Role, permissionKey: string, allowed: boolean, actor: RequestUser, ip?: string) {
    await this.ensureSeed();
    if (!PERMISSIONS.some((p) => p.key === permissionKey)) {
      throw new BadRequestException('Hak akses tidak dikenali.');
    }
    if (!ROLES.includes(role)) throw new BadRequestException('Peran tidak dikenali.');

    await this.prisma.rolePermission.upsert({
      where: { role_permissionKey: { role, permissionKey } },
      update: { allowed },
      create: { role, permissionKey, allowed },
    });
    this.cache = null; // invalidate so enforcement picks up the change

    await this.audit.log({
      entityType: 'RolePermission',
      entityId: `${role}:${permissionKey}`,
      action: AuditAction.UPDATE,
      actor,
      newValue: { role, permissionKey, allowed },
      ipAddress: ip,
    });
    return this.getMatrix();
  }
}
