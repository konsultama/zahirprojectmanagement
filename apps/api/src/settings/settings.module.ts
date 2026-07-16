import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SettingsController } from './settings.controller';
import { RbacService } from './rbac.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  controllers: [SettingsController],
  providers: [RbacService, { provide: APP_GUARD, useClass: PermissionsGuard }],
})
export class SettingsModule {}
