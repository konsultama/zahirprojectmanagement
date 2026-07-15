import { Module } from '@nestjs/common';
import { ExecutingController } from './executing.controller';
import { ExecutingService } from './executing.service';

@Module({
  controllers: [ExecutingController],
  providers: [ExecutingService],
})
export class ExecutingModule {}
