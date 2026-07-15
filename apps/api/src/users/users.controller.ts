import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  /** Source for PIC / approver dropdowns, and the demo user switcher. */
  @Get()
  async list(@Query('search') search?: string, @Query('role') role?: string) {
    const where: Prisma.UserWhereInput = { deletedAt: null, isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (role && role in Role) where.role = role as Role;

    return this.prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }
}
