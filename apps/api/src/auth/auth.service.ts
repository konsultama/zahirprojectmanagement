import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { signToken, verifyPassword, verifyToken, JwtPayload } from './jwt.util';

const EIGHT_HOURS = 8 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private secret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-secret-change-me');
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), deletedAt: null, isActive: true },
    });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Email atau kata sandi salah.');
    }
    const token = signToken({ sub: user.id, role: user.role, name: user.name }, this.secret(), EIGHT_HOURS);
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  /** Verify a token and return the current user (used by /auth/me and the middleware). */
  async resolveToken(token: string): Promise<{ id: string; name: string; role: string } | null> {
    const payload: JwtPayload | null = verifyToken(token, this.secret());
    if (!payload?.sub) return null;
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: { id: true, name: true, role: true, email: true },
    });
    return user;
  }

  async me(token: string) {
    const user = await this.resolveToken(token);
    if (!user) throw new UnauthorizedException('Sesi tidak valid atau kedaluwarsa.');
    return user;
  }
}
