import { Body, Controller, Get, Param, Patch, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { StagesService } from './stages.service';
import { InitiatingService } from './initiating.service';
import { Permission } from '../common/auth/permission.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';
import { ChecklistUpdateDto, RejectDto, SaveInitiatingDto } from './dto/initiating.dto';

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(user?: RequestUser): RequestUser {
  if (!user) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return user;
}

@Controller('projects/:projectId')
export class StagesController {
  constructor(
    private readonly stages: StagesService,
    private readonly initiating: InitiatingService,
  ) {}

  @Get('stages')
  listStages(@Param('projectId') projectId: string) {
    return this.stages.list(projectId);
  }

  // ---- Initiating (§7.2.2) ----

  @Get('initiating')
  getInitiating(@Param('projectId') projectId: string) {
    return this.initiating.get(projectId);
  }

  @Put('initiating')
  @Permission('initiating.fill')
  saveInitiating(
    @Param('projectId') projectId: string,
    @Body() dto: SaveInitiatingDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.initiating.save(projectId, dto, must(user), ip(req));
  }

  @Patch('initiating/checklist/:itemId')
  @Permission('initiating.fill')
  updateChecklist(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ChecklistUpdateDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.initiating.updateChecklist(projectId, itemId, dto, must(user), ip(req));
  }

  @Post('initiating/submit')
  @Permission('initiating.fill')
  submitInitiating(
    @Param('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.initiating.submit(projectId, must(user), ip(req));
  }

  @Post('initiating/approve')
  @Permission('initiating.approve')
  approveInitiating(
    @Param('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.initiating.approve(projectId, must(user), ip(req));
  }

  @Post('initiating/reject')
  @Permission('initiating.approve')
  rejectInitiating(
    @Param('projectId') projectId: string,
    @Body() dto: RejectDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.initiating.reject(projectId, dto, must(user), ip(req));
  }
}
