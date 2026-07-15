import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { ClosingService } from './closing.service';
import { CreateDocumentDto, EvaluationDto, MasterUpdateDto, UpdateDocumentDto } from './dto/closing.dto';
import { RejectDto } from '../stages/dto/initiating.dto';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return u;
}

@Controller('projects/:projectId/closing')
export class ClosingController {
  constructor(private readonly closing: ClosingService) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.closing.get(projectId);
  }

  @Get('report')
  report(@Param('projectId') projectId: string) {
    return this.closing.report(projectId);
  }

  @Patch('documents/:id')
  @Roles(Role.ADMIN, Role.PM)
  updateDoc(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.updateDocument(projectId, id, dto, must(u), ip(req));
  }

  @Post('documents')
  @Roles(Role.ADMIN, Role.PM)
  addDoc(@Param('projectId') projectId: string, @Body() dto: CreateDocumentDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.addDocument(projectId, dto, must(u), ip(req));
  }

  @Delete('documents/:id')
  @Roles(Role.ADMIN, Role.PM)
  removeDoc(@Param('projectId') projectId: string, @Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.removeDocument(projectId, id, must(u), ip(req));
  }

  @Put('evaluation')
  @Roles(Role.ADMIN, Role.PM)
  saveEval(@Param('projectId') projectId: string, @Body() dto: EvaluationDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.saveEvaluation(projectId, dto, must(u), ip(req));
  }

  @Post('master-update')
  @Roles(Role.ADMIN, Role.PM)
  masterUpdate(@Param('projectId') projectId: string, @Body() dto: MasterUpdateDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.applyMasterUpdate(projectId, dto, must(u), ip(req));
  }

  @Post('submit')
  @Roles(Role.ADMIN, Role.PM)
  submit(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.submit(projectId, must(u), ip(req));
  }

  @Post('approve')
  @Roles(Role.ADMIN)
  approve(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.approve(projectId, must(u), ip(req));
  }

  @Post('reject')
  @Roles(Role.ADMIN)
  reject(@Param('projectId') projectId: string, @Body() dto: RejectDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.reject(projectId, dto.reason, must(u), ip(req));
  }
}
