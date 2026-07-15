import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { ExecutingService } from './executing.service';
import { CostActualDto, UpdateExecutionDto } from './dto/executing.dto';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return u;
}

@Controller('projects/:projectId/executing')
export class ExecutingController {
  constructor(private readonly executing: ExecutingService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.executing.list(projectId);
  }

  @Patch(':wbsItemId')
  @Roles(Role.ADMIN, Role.PM, Role.SUPERVISOR)
  update(
    @Param('projectId') projectId: string,
    @Param('wbsItemId') wbsItemId: string,
    @Body() dto: UpdateExecutionDto,
    @CurrentUser() u: RequestUser,
    @Req() req: Request,
  ) {
    return this.executing.update(projectId, wbsItemId, dto, must(u), ip(req));
  }

  @Post(':wbsItemId/cost')
  @Roles(Role.ADMIN, Role.PM, Role.SUPERVISOR)
  addCost(
    @Param('projectId') projectId: string,
    @Param('wbsItemId') wbsItemId: string,
    @Body() dto: CostActualDto,
    @CurrentUser() u: RequestUser,
    @Req() req: Request,
  ) {
    return this.executing.addCost(projectId, wbsItemId, dto, must(u), ip(req));
  }

  @Delete('cost/:costId')
  @Roles(Role.ADMIN, Role.PM, Role.SUPERVISOR)
  deleteCost(
    @Param('projectId') projectId: string,
    @Param('costId') costId: string,
    @CurrentUser() u: RequestUser,
    @Req() req: Request,
  ) {
    return this.executing.deleteCost(projectId, costId, must(u), ip(req));
  }
}
