import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [AuditService, AuditLogService],
  exports: [AuditService, AuditLogService],
})
export class AuditModule {}
