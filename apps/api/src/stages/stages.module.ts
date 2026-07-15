import { Module } from '@nestjs/common';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { InitiatingService } from './initiating.service';

@Module({
  controllers: [StagesController],
  providers: [StagesService, InitiatingService],
})
export class StagesModule {}
