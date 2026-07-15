import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MasterService } from './master.service';
import { MASTER_REGISTRY } from './master.registry';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return u;
}

@Controller('master')
export class MasterController {
  constructor(private readonly master: MasterService) {}

  /** Metadata for the UI: available entities + labels. */
  @Get()
  entities() {
    return Object.entries(MASTER_REGISTRY).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      fields: Object.keys(cfg.fields),
    }));
  }

  @Get(':entity')
  list(
    @Param('entity') entity: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.master.list(entity, { page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined, search });
  }

  @Post(':entity')
  @Roles(Role.ADMIN, Role.PM)
  create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @CurrentUser() u: RequestUser) {
    return this.master.create(entity, body, must(u));
  }

  @Patch(':entity/:id')
  @Roles(Role.ADMIN, Role.PM)
  update(@Param('entity') entity: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentUser() u: RequestUser) {
    return this.master.update(entity, id, body, must(u));
  }

  @Delete(':entity/:id')
  @Roles(Role.ADMIN)
  remove(@Param('entity') entity: string, @Param('id') id: string, @CurrentUser() u: RequestUser) {
    return this.master.remove(entity, id, must(u));
  }
}
