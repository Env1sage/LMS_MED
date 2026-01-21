import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../common/enums';

/**
 * Tenant Isolation Middleware
 * Enforces strict tenant boundaries at API level
 * Every request must include and validate collegeId or publisherId
 * No cross-tenant data access allowed
 */
@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  constructor(private auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).users;

    // Skip for unauthenticated requests (handled by auth guards)
    if (!user) {
      return next();
    }

    // Extract tenant context from request
    const requestCollegeId = req.body?.collegeId || req.query?.collegeId || req.params?.collegeId;
    const requestPublisherId = req.body?.publisherId || req.query?.publisherId || req.params?.publisherId;

    // Bitflow Owner can access all tenants
    if (user.role === 'BITFLOW_OWNER') {
      return next();
    }

    // For college users - validate collegeId match
    if (user.collegeId) {
      if (requestCollegeId && requestCollegeId !== user.collegeId) {
        await this.auditService.log({
          userId: user.userId,
          collegeId: user.collegeId,
          action: AuditAction.UNAUTHORIZED_ACCESS,
          description: `Attempted cross-tenant access to college: ${requestCollegeId}`,
          metadata: { 
            userCollegeId: user.collegeId, 
            requestedCollegeId: requestCollegeId,
            path: req.path,
            method: req.method,
          },
        });
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }

    // For publisher users - validate publisherId match
    if (user.publisherId) {
      if (requestPublisherId && requestPublisherId !== user.publisherId) {
        await this.auditService.log({
          userId: user.userId,
          publisherId: user.publisherId,
          action: AuditAction.UNAUTHORIZED_ACCESS,
          description: `Attempted cross-tenant access to publisher: ${requestPublisherId}`,
          metadata: { 
            userPublisherId: user.publisherId, 
            requestedPublisherId: requestPublisherId,
            path: req.path,
            method: req.method,
          },
        });
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }

    next();
  }
}
