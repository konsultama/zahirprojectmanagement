import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditService } from './audit/audit.service';
import { RolesGuard } from './auth/roles.guard';

@Global()
@Module({
  providers: [
    AuditService,
    // Register RolesGuard globally; routes without @Roles() are unrestricted.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuditService],
})
export class CommonModule {}
