import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? null;

function requireUser(user?: RequestUser): RequestUser {
  if (!user) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
  return user;
}

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PM)
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.projects.create(dto, requireUser(user), ip(req) ?? undefined);
  }

  @Get()
  findAll(@Query() query: ListProjectsDto, @CurrentUser() user?: RequestUser) {
    return this.projects.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.projects.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PM)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.projects.update(id, dto, requireUser(user), ip(req) ?? undefined);
  }

  @Post(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    // per-transition role check lives in the service for a precise message
    return this.projects.changeStatus(id, dto.status, requireUser(user), dto.reason, ip(req) ?? undefined);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Query('reason') reason: string | undefined,
    @Req() req: Request,
  ) {
    return this.projects.remove(id, requireUser(user), reason, ip(req) ?? undefined);
  }
}
