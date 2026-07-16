import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { PERMISSION_KEY } from '../common/auth/permission.decorator';
import { PERMISSIONS } from './rbac.permissions';
import { RbacService } from './rbac.service';

/**
 * Enforces @Permission() against the live RBAC matrix (§6). Routes without a
 * @Permission are ignored (handled by RolesGuard or left open).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!key) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new UnauthorizedException('Otentikasi diperlukan. Silakan masuk.');

    const allowed = await this.rbac.isAllowed(user.role as Role, key);
    if (!allowed) {
      const label = PERMISSIONS.find((p) => p.key === key)?.label ?? key;
      throw new ForbiddenException(`Peran ${user.role} tidak diizinkan untuk: ${label}.`);
    }
    return true;
  }
}
