import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log a blocked access attempt
   */
  async logBlockedAccess(
    userId: string,
    stepId: string,
    reason: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ) {
    return this.createLog({
      userId,
      action: AuditAction.BLOCKED_ACCESS,
      entityType: 'LearningFlowStep',
      entityId: stepId,
      description: `Blocked access: ${reason}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log course creation
   */
  async logCourseCreated(
    userId: string,
    courseId: string,
    collegeId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog({
      userId,
      collegeId,
      action: AuditAction.COURSE_CREATED,
      entityType: 'Course',
      entityId: courseId,
      description: 'Course created',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log course published
   */
  async logCoursePublished(
    userId: string,
    courseId: string,
    collegeId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog({
      userId,
      collegeId,
      action: AuditAction.COURSE_PUBLISHED,
      entityType: 'Course',
      entityId: courseId,
      description: 'Course published',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log course assignment
   */
  async logCourseAssigned(
    userId: string,
    courseId: string,
    studentIds: string[],
    collegeId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog({
      userId,
      collegeId,
      action: AuditAction.COURSE_ASSIGNED,
      entityType: 'CourseAssignment',
      entityId: courseId,
      description: `Course assigned to ${studentIds.length} student(s)`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log learning flow modification
   */
  async logFlowModified(
    userId: string,
    courseId: string,
    collegeId: string,
    changes: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog({
      userId,
      collegeId,
      action: AuditAction.FLOW_MODIFIED,
      entityType: 'Course',
      entityId: courseId,
      description: `Learning flow modified: ${changes}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log step completion
   */
  async logStepCompleted(
    userId: string,
    stepId: string,
    courseId: string,
    completionPercent: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog({
      userId,
      action: AuditAction.STEP_COMPLETED,
      entityType: 'LearningFlowStep',
      entityId: stepId,
      description: `Step completed: ${completionPercent}%`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log invalid completion attempt
   */
  async logInvalidCompletion(
    userId: string,
    stepId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.createLog({
      userId,
      action: AuditAction.INVALID_COMPLETION,
      entityType: 'LearningFlowStep',
      entityId: stepId,
      description: `Invalid completion attempt: ${reason}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Create audit log entry
   */
  private async createLog(data: {
    userId: string;
    collegeId?: string;
    publisherId?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        collegeId: data.collegeId || null,
        publisherId: data.publisherId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get audit logs for a course
   */
  async getCourseAuditLogs(courseId: string, limit: number = 100) {
    return this.prisma.audit_logs.findMany({
      where: {
        entityType: { in: ['Course', 'LearningFlowStep', 'CourseAssignment'] },
        entityId: courseId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        users: {
          select: {
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get blocked access attempts for analytics
   */
  async getBlockedAccessAttempts(collegeId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.audit_logs.findMany({
      where: {
        collegeId,
        action: AuditAction.BLOCKED_ACCESS,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      include: {
        users: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Generic log method for Phase 6 student portal events
   */
  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any,
  ) {
    // Map string action to AuditAction enum
    const actionMap: { [key: string]: AuditAction } = {
      'ACCESS_DENIED': AuditAction.BLOCKED_ACCESS,
      'COURSE_ACCESS': AuditAction.COURSE_CREATED, // Reuse existing
      'COURSE_STARTED': AuditAction.COURSE_CREATED,
      'STEP_ACCESS': AuditAction.STEP_COMPLETED, // Reuse existing
      'STEP_COMPLETED': AuditAction.STEP_COMPLETED,
    };

    const auditAction = actionMap[action] || AuditAction.BLOCKED_ACCESS;

    return this.createLog({
      userId,
      action: auditAction,
      entityType,
      entityId,
      description: `${action}: ${entityType} ${entityId}`,
    });
  }
}
