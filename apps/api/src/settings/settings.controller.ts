import { Body, Controller, Get, Patch, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { RbacService } from './rbac.service';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

class SetPermissionDto {
  @IsEnum(Role) role!: Role;
  @IsString() permissionKey!: string;
  @IsBoolean() allowed!: boolean;
}

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;

@Controller('settings/rbac')
export class SettingsController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  getMatrix() {
    return this.rbac.getMatrix();
  }

  @Patch()
  @Roles(Role.ADMIN)
  setCell(@Body() dto: SetPermissionDto, @CurrentUser() user: RequestUser | undefined, @Req() req: Request) {
    if (!user) throw new UnauthorizedException('Otentikasi diperlukan (header x-user-id).');
    return this.rbac.setCell(dto.role, dto.permissionKey, dto.allowed, user, ip(req));
  }
}
