import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SettingsController } from './settings.controller';
import { SmtpController } from './smtp.controller';
import { RbacService } from './rbac.service';
import { SmtpService } from './smtp.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  controllers: [SettingsController, SmtpController],
  providers: [RbacService, SmtpService, { provide: APP_GUARD, useClass: PermissionsGuard }],
})
export class SettingsModule {}
