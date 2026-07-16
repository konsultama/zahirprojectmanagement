import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { MonitoringService } from './monitoring.service';
import { RiskService } from './risk.service';
import { CreateRiskDto, UpdateQcDto, UpdateRiskDto } from './dto/monitoring.dto';
import { Roles } from '../common/auth/roles.decorator';
import { Permission } from '../common/auth/permission.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return u;
}

@Controller('projects/:projectId/monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly risks: RiskService,
  ) {}

  @Get('qc')
  qcList(@Param('projectId') projectId: string) {
    return this.monitoring.qcList(projectId);
  }

  @Patch('qc/:wbsItemId')
  @Permission('qc.fill')
  updateQc(
    @Param('projectId') projectId: string,
    @Param('wbsItemId') wbsItemId: string,
    @Body() dto: UpdateQcDto,
    @CurrentUser() u: RequestUser,
    @Req() req: Request,
  ) {
    return this.monitoring.updateQc(projectId, wbsItemId, dto, must(u), ip(req));
  }

  @Get('dashboard')
  dashboard(@Param('projectId') projectId: string) {
    return this.monitoring.dashboard(projectId);
  }

  // ---- Risk register ----
  @Get('risks')
  listRisks(@Param('projectId') projectId: string) {
    return this.risks.list(projectId);
  }

  @Post('risks')
  @Roles(Role.ADMIN, Role.PM, Role.QC)
  createRisk(@Param('projectId') projectId: string, @Body() dto: CreateRiskDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.risks.create(projectId, dto, must(u), ip(req));
  }

  @Patch('risks/:id')
  @Roles(Role.ADMIN, Role.PM, Role.QC)
  updateRisk(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateRiskDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.risks.update(projectId, id, dto, must(u), ip(req));
  }

  @Delete('risks/:id')
  @Roles(Role.ADMIN, Role.PM)
  removeRisk(@Param('projectId') projectId: string, @Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.risks.remove(projectId, id, must(u), ip(req));
  }
}
