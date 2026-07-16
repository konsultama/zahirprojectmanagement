import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ClosingService } from './closing.service';
import { CreateDocumentDto, EvaluationDto, MasterUpdateDto, UpdateDocumentDto } from './dto/closing.dto';
import { RejectDto } from '../stages/dto/initiating.dto';
import { Permission } from '../common/auth/permission.decorator';
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

  @Get('report.pdf')
  async reportPdf(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser | undefined, @Res() res: Response) {
    must(u);
    const { buffer, filename } = await this.closing.reportPdf(projectId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Patch('documents/:id')
  @Permission('closing.fill')
  updateDoc(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.updateDocument(projectId, id, dto, must(u), ip(req));
  }

  @Post('documents')
  @Permission('closing.fill')
  addDoc(@Param('projectId') projectId: string, @Body() dto: CreateDocumentDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.addDocument(projectId, dto, must(u), ip(req));
  }

  @Delete('documents/:id')
  @Permission('closing.fill')
  removeDoc(@Param('projectId') projectId: string, @Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.removeDocument(projectId, id, must(u), ip(req));
  }

  @Put('evaluation')
  @Permission('closing.fill')
  saveEval(@Param('projectId') projectId: string, @Body() dto: EvaluationDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.saveEvaluation(projectId, dto, must(u), ip(req));
  }

  @Post('master-update')
  @Permission('closing.fill')
  masterUpdate(@Param('projectId') projectId: string, @Body() dto: MasterUpdateDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.applyMasterUpdate(projectId, dto, must(u), ip(req));
  }

  @Post('submit')
  @Permission('closing.fill')
  submit(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.submit(projectId, must(u), ip(req));
  }

  @Post('approve')
  @Permission('closing.approve')
  approve(@Param('projectId') projectId: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.approve(projectId, must(u), ip(req));
  }

  @Post('reject')
  @Permission('closing.approve')
  reject(@Param('projectId') projectId: string, @Body() dto: RejectDto, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.closing.reject(projectId, dto.reason, must(u), ip(req));
  }
}
