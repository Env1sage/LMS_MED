import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogData {
  userId?: string;
  collegeId?: string;
  publisherId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event - immutable, append-only
   * All security and access events must be logged
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.audit_logs.create({
        data: {
          id: uuidv4(),
          userId: data.userId,
          collegeId: data.collegeId,
          publisherId: data.publisherId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          description: data.description,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Audit logging must never fail silently
      console.error('CRITICAL: Audit log failed', error);
      // In production, this should trigger alerts
    }
  }

  /**
   * Query audit logs - Only accessible by Bitflow Owner
   * Results are never modified, only read
   */
  async queryLogs(filters: {
    userId?: string;
    collegeId?: string;
    publisherId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.collegeId) where.collegeId = filters.collegeId;
    if (filters.publisherId) where.publisherId = filters.publisherId;
    if (filters.action) where.action = filters.action;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.audit_logs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }
}
