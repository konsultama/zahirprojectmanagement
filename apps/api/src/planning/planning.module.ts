import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { WbsService } from './wbs.service';
import { PlanningService } from './planning.service';

@Module({
  controllers: [PlanningController],
  providers: [WbsService, PlanningService],
})
export class PlanningModule {}
