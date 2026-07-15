import { Controller, Get, Query } from '@nestjs/common';
import { ContactType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Search-as-you-type source for Client / Vendor dropdowns (§12.8). */
  @Get()
  async list(@Query('search') search?: string, @Query('type') type?: string) {
    const where: Prisma.ContactWhereInput = { deletedAt: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (type === 'CLIENT') where.type = { in: [ContactType.CLIENT, ContactType.BOTH] };
    if (type === 'VENDOR') where.type = { in: [ContactType.VENDOR, ContactType.BOTH] };

    return this.prisma.contact.findMany({
      where,
      select: { id: true, name: true, type: true, email: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }
}
