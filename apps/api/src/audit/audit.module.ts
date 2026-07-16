import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { GlobalAuditController } from './global-audit.controller';

@Module({
  controllers: [AuditController, GlobalAuditController],
})
export class AuditModule {}
