import { Body, Controller, Get, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { SmtpService } from './smtp.service';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

class UpdateSmtpDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() host?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(65535) port?: number;
  @IsOptional() @IsBoolean() secure?: boolean;
  @IsOptional() @IsString() user?: string;
  @IsOptional() @IsString() pass?: string;
  @IsOptional() @IsString() from?: string;
}
class TestSmtpDto {
  @IsEmail({}, { message: 'Alamat email tujuan tidak valid.' }) to!: string;
}

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan.');
  return u;
}

@Controller('settings/smtp')
export class SmtpController {
  constructor(private readonly smtp: SmtpService) {}

  @Get()
  @Roles(Role.ADMIN)
  get() {
    return this.smtp.get();
  }

  @Patch()
  @Roles(Role.ADMIN)
  update(@Body() dto: UpdateSmtpDto, @CurrentUser() u: RequestUser | undefined, @Req() req: Request) {
    return this.smtp.update(dto, must(u), ip(req));
  }

  @Post('test')
  @Roles(Role.ADMIN)
  test(@Body() dto: TestSmtpDto) {
    return this.smtp.test(dto.to);
  }
}
