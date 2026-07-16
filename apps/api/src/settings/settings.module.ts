import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SettingsController } from './settings.controller';
import { SmtpController } from './smtp.controller';
import { ChannelsController } from './channels.controller';
import { RbacService } from './rbac.service';
import { SmtpService } from './smtp.service';
import { ChannelsService } from './channels.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  controllers: [SettingsController, SmtpController, ChannelsController],
  providers: [RbacService, SmtpService, ChannelsService, { provide: APP_GUARD, useClass: PermissionsGuard }],
})
export class SettingsModule {}
