import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { WbsService } from './wbs.service';
import { PlanningService } from './planning.service';
import { CreateWbsDto, OverbudgetDto, UpdateWbsDto } from './dto/wbs.dto';
import { RejectDto } from '../stages/dto/initiating.dto';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return u;
}

@Controller('projects/:projectId/planning')
export class PlanningController {
  constructor(
    private readonly wbs: WbsService,
    private readonly planning: PlanningService,
  ) {}

  @Get()
  getTree(@Param('projectId') projectId: string) {
    return this.wbs.getTree(projectId);
  }

  @Get('baselines')
  baselines(@Param('projectId') projectId: string) {
    return this.planning.baselines(projectId);
  }

  @Post('wbs')
  @Roles(Role.ADMIN, Role.PM)
  createRow(@Param('projectId') projectId: string, @Body() dto: CreateWbsDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.wbs.create(projectId, dto, must(u), ip(req));
  }

  @Patch('wbs/:id')
  @Roles(Role.ADMIN, Role.PM)
  updateRow(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateWbsDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.wbs.update(projectId, id, dto, must(u), ip(req));
  }

  @Delete('wbs/:id')
  @Roles(Role.ADMIN, Role.PM)
  deleteRow(@Param('projectId') projectId: string, @Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.wbs.remove(projectId, id, must(u), ip(req));
  }

  @Post('overbudget')
  @Roles(Role.ADMIN, Role.FINANCE)
  setOverbudget(@Param('projectId') projectId: string, @Body() dto: OverbudgetDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.planning.setOverbudget(projectId, dto, must(u), ip(req));
  }

  @Post('submit')
  @Roles(Role.ADMIN, Role.PM)
  submit(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.planning.submit(projectId, must(u), ip(req));
  }

  @Post('approve')
  @Roles(Role.ADMIN, Role.FINANCE)
  approve(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.planning.approve(projectId, must(u), ip(req));
  }

  @Post('reject')
  @Roles(Role.ADMIN, Role.FINANCE)
  reject(@Param('projectId') projectId: string, @Body() dto: RejectDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.planning.reject(projectId, dto.reason, must(u), ip(req));
  }
}
