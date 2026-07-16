import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';

export interface RequestUser {
  id: string;
  name: string;
  role: string;
}

declare module 'express' {
  interface Request {
    user?: RequestUser;
  }
}

/**
 * Resolves the acting user from a JWT (`Authorization: Bearer <token>`).
 * Falls back to the `x-user-id` header for dev/testing convenience — that
 * fallback should be disabled in production.
 */
@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const user = await this.auth.resolveToken(authHeader.slice(7));
      if (user) req.user = { id: user.id, name: user.name, role: user.role };
      return next();
    }

    // Query-param token: EventSource (SSE) can't set an Authorization header.
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (queryToken) {
      const user = await this.auth.resolveToken(queryToken);
      if (user) req.user = { id: user.id, name: user.name, role: user.role };
      return next();
    }

    // dev fallback
    const userId = req.header('x-user-id');
    if (userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null, isActive: true },
        select: { id: true, name: true, role: true },
      });
      if (user) req.user = user;
    }
    next();
  }
}
