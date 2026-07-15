import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { RbacService } from './rbac.service';

@Module({
  controllers: [SettingsController],
  providers: [RbacService],
})
export class SettingsModule {}
