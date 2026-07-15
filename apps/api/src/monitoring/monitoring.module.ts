import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { RiskService } from './risk.service';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, RiskService],
})
export class MonitoringModule {}
