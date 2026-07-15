import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

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
 * MVP auth: resolves the acting user from the `x-user-id` header.
 * Replace with JWT auth (NFR §10) later — the rest of the code only depends
 * on `req.user`, so the swap is localized.
 */
@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const userId = req.header('x-user-id');
    if (userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null, isActive: true },
        select: { id: true, name: true, role: true },
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  }
}
