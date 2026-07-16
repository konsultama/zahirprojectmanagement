import { Body, Controller, Get, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { ChannelsService } from './channels.service';
import { Roles } from '../common/auth/roles.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

class TelegramUpdateDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() botToken?: string;
  @IsOptional() @IsString() chatId?: string;
}
class WhatsappUpdateDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() token?: string;
  @IsOptional() @IsString() phoneId?: string;
  @IsOptional() @IsString() recipient?: string;
  @IsOptional() @IsString() apiVersion?: string;
}

const ip = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? undefined;
function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan.');
  return u;
}

@Controller('settings')
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get('telegram')
  @Roles(Role.ADMIN)
  getTelegram() {
    return this.channels.getTelegram();
  }
  @Patch('telegram')
  @Roles(Role.ADMIN)
  updateTelegram(@Body() dto: TelegramUpdateDto, @CurrentUser() u: RequestUser | undefined, @Req() req: Request) {
    return this.channels.updateTelegram(dto, must(u), ip(req));
  }
  @Post('telegram/test')
  @Roles(Role.ADMIN)
  testTelegram() {
    return this.channels.testTelegram();
  }

  @Get('whatsapp')
  @Roles(Role.ADMIN)
  getWhatsapp() {
    return this.channels.getWhatsapp();
  }
  @Patch('whatsapp')
  @Roles(Role.ADMIN)
  updateWhatsapp(@Body() dto: WhatsappUpdateDto, @CurrentUser() u: RequestUser | undefined, @Req() req: Request) {
    return this.channels.updateWhatsapp(dto, must(u), ip(req));
  }
  @Post('whatsapp/test')
  @Roles(Role.ADMIN)
  testWhatsapp() {
    return this.channels.testWhatsapp();
  }
}
