import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../../audit/audit-log.service';

/**
 * Step Access Middleware - Phase 6 removed
 * This middleware is now a pass-through for Phase 0-5
 */
@Injectable()
export class StepAccessMiddleware implements NestMiddleware {
  constructor(
    private auditLogService: AuditLogService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Phase 6 removed - allow all access for Phase 0-5
    return next();
  }
}
