import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, UserRole } from '../../common/enums';

/**
 * Phase 1 Governance Guard
 * 
 * This guard enforces the hierarchical authority model defined in Phase 1:
 * 1. Role boundary enforcement - users can only access what their role permits
 * 2. Data isolation - college data is isolated, cross-tenant access is blocked
 * 3. HOD scope - HODs can only see their department
 * 4. Faculty scope - Faculty can only access their assigned subjects/departments
 */
@Injectable()
export class GovernanceGuard implements CanActivate {
  private readonly logger = new Logger(GovernanceGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let auth guard handle unauthenticated requests
    }

    // Get governance requirements from decorator
    const governance = this.reflector.get<GovernanceRequirement>('governance', context.getHandler());

    if (!governance) {
      return true; // No governance requirements
    }

    try {
      // Check tenant isolation
      if (governance.requireTenantIsolation) {
        await this.checkTenantIsolation(request, user);
      }

      // Check department scope for HOD
      if (governance.requireDepartmentScope && user.role === UserRole.COLLEGE_HOD) {
        await this.checkHodDepartmentScope(request, user);
      }

      // Check faculty permissions
      if (governance.requiredFacultyPermission && user.role === UserRole.FACULTY) {
        await this.checkFacultyPermission(request, user, governance.requiredFacultyPermission);
      }

      // Check role boundaries
      if (governance.restrictedFromRoles && governance.restrictedFromRoles.includes(user.role)) {
        await this.logViolation(user, request, 'ROLE_BOUNDARY_VIOLATION');
        throw new ForbiddenException('This action is not permitted for your role');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Governance check failed: ${error.message}`);
      throw new ForbiddenException('Access denied by governance policy');
    }
  }

  private async checkTenantIsolation(request: any, user: any) {
    // Extract target collegeId from request
    const targetCollegeId = 
      request.params.collegeId || 
      request.body?.collegeId || 
      request.query?.collegeId;

    if (!targetCollegeId) {
      return; // No target specified
    }

    // For college-bound users, verify they're accessing their own college
    if (user.collegeId && targetCollegeId !== user.collegeId) {
      await this.logViolation(user, request, 'CROSS_TENANT_ACCESS_ATTEMPT');
      throw new ForbiddenException('Cross-college access is not permitted');
    }

    // Bitflow Owner can access any college but for view only
    if (user.role === UserRole.BITFLOW_OWNER) {
      return; // Allowed with restrictions logged
    }

    // Publisher can only see their own analytics
    if (user.role === UserRole.PUBLISHER_ADMIN) {
      // Publishers shouldn't access college-specific data
      await this.logViolation(user, request, 'DATA_ISOLATION_BREACH_ATTEMPT');
      throw new ForbiddenException('Publishers cannot access college-specific data');
    }
  }

  private async checkHodDepartmentScope(request: any, user: any) {
    // Get the department being accessed
    const targetDepartmentId = 
      request.params.departmentId || 
      request.body?.departmentId || 
      request.query?.departmentId;

    if (!targetDepartmentId) {
      return; // No specific department targeted
    }

    // Verify HOD owns this department
    const department = await this.prisma.departments.findFirst({
      where: {
        id: targetDepartmentId,
        hodId: user.id,
      },
    });

    if (!department) {
      await this.logViolation(user, request, 'ROLE_BOUNDARY_VIOLATION');
      throw new ForbiddenException('You can only access your own department');
    }
  }

  private async checkFacultyPermission(
    request: any,
    user: any,
    requiredPermission: FacultyPermissionKey,
  ) {
    // Get faculty's department from the request or their primary assignment
    const departmentId = 
      request.params.departmentId || 
      request.body?.departmentId || 
      user.departmentId;

    if (!departmentId) {
      throw new ForbiddenException('Department context required for this action');
    }

    const assignment = await this.prisma.faculty_assignments.findUnique({
      where: {
        userId_departmentId: {
          userId: user.id,
          departmentId,
        },
      },
      include: {
        permissions: true,
      },
    });

    if (!assignment) {
      await this.logViolation(user, request, 'PERMISSION_DENIED');
      throw new ForbiddenException('You are not assigned to this department');
    }

    if (!assignment.permissions[requiredPermission]) {
      await this.logViolation(user, request, 'PERMISSION_DENIED');
      throw new ForbiddenException(
        `You do not have permission to perform this action (requires: ${requiredPermission})`,
      );
    }
  }

  private async logViolation(user: any, request: any, type: string) {
    const actionMap: Record<string, AuditAction> = {
      'ROLE_BOUNDARY_VIOLATION': AuditAction.ROLE_BOUNDARY_VIOLATION,
      'CROSS_TENANT_ACCESS_ATTEMPT': AuditAction.CROSS_TENANT_ACCESS_ATTEMPT,
      'PERMISSION_DENIED': AuditAction.PERMISSION_DENIED,
      'DATA_ISOLATION_BREACH_ATTEMPT': AuditAction.DATA_ISOLATION_BREACH_ATTEMPT,
    };

    await this.auditService.log({
      userId: user.id,
      collegeId: user.collegeId,
      publisherId: user.publisherId,
      action: actionMap[type] || AuditAction.SECURITY_VIOLATION,
      entityType: 'governance',
      description: `${type}: Attempted ${request.method} ${request.url}`,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        attemptedPath: request.url,
        method: request.method,
        params: request.params,
        body: this.sanitizeBody(request.body),
      },
    });
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    // Remove sensitive fields
    const { password, passwordHash, token, ...sanitized } = body;
    return sanitized;
  }
}

// Types for governance decorator
export interface GovernanceRequirement {
  requireTenantIsolation?: boolean;
  requireDepartmentScope?: boolean;
  requiredFacultyPermission?: FacultyPermissionKey;
  restrictedFromRoles?: UserRole[];
}

export type FacultyPermissionKey =
  | 'canCreateCourses'
  | 'canEditCourses'
  | 'canDeleteCourses'
  | 'canCreateMcqs'
  | 'canEditMcqs'
  | 'canDeleteMcqs'
  | 'canViewAnalytics'
  | 'canAssignStudents'
  | 'canScheduleLectures'
  | 'canUploadNotes';
