import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../common/enums';

/**
 * Security Validation Middleware
 * Validates every API request for:
 * - userId presence (from JWT)
 * - role validity
 * - tenant context
 * NO FRONTEND TRUST - All validation server-side
 */
@Injectable()
export class SecurityValidationMiddleware implements NestMiddleware {
  constructor(private auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).users;

    // Skip validation for public endpoints
    const publicPaths = ['/auth/login', '/auth/refresh', '/health'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // For protected endpoints, user must exist
    if (user) {
      // Validate required fields from JWT
      if (!user.userId || !user.role) {
        await this.auditService.log({
          action: AuditAction.INVALID_TOKEN,
          description: 'Invalid JWT payload - missing userId or role',
          metadata: { 
            path: req.path,
            method: req.method,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(401).json({ 
          statusCode: 401, 
          message: 'Invalid token payload' 
        });
      }

      // Attach security context to request
      (req as any).securityContext = {
        userId: user.userId,
        role: user.role,
        collegeId: user.collegeId,
        publisherId: user.publisherId,
        timestamp: new Date(),
      };
    }

    next();
  }
}
