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
import { ROLES_KEY } from './roles.decorator';

/**
 * Enforces @Roles() metadata against req.user (set by CurrentUserMiddleware).
 * A route with @Roles requires an authenticated user with one of the roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id tidak dikenali).');
    }
    if (!required.includes(user.role as Role)) {
      throw new ForbiddenException(
        `Peran ${user.role} tidak diizinkan. Dibutuhkan: ${required.join(', ')}.`,
      );
    }
    return true;
  }
}
