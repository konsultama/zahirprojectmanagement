import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { PERMISSIONS, ROLES, ROLE_LABELS } from './rbac.permissions';

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
