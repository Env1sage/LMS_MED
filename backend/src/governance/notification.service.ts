import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateNotificationDto, UpdateNotificationDto, QueryNotificationDto, NotificationAudience } from './dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new notification/announcement
   * Only College Admins, Deans, or HODs can create notifications
   */
  async create(dto: CreateNotificationDto, userId: string, collegeId: string) {
    // Validate department if audience is DEPARTMENT
    if (dto.audience === NotificationAudience.DEPARTMENT && !dto.departmentId) {
      throw new BadRequestException('Department ID is required when audience is DEPARTMENT');
    }

    // Validate academic year if audience is BATCH
    if (dto.audience === NotificationAudience.BATCH && !dto.academicYear) {
      throw new BadRequestException('Academic year is required when audience is BATCH');
    }

    // Verify department belongs to college if specified
    if (dto.departmentId) {
      const dept = await this.prisma.departments.findFirst({
        where: { id: dto.departmentId, collegeId },
      });
      if (!dept) {
        throw new BadRequestException('Invalid department');
      }
    }

    const notification = await this.prisma.notifications.create({
      data: {
        id: uuidv4(),
        collegeId,
        createdBy: userId,
        title: dto.title,
        message: dto.message,
        type: dto.type as any || 'ANNOUNCEMENT',
        priority: dto.priority as any || 'NORMAL',
        audience: dto.audience as any || 'ALL',
        departmentId: dto.departmentId,
        academicYear: dto.academicYear as any,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Log the action
    await this.auditLogService.log(
      userId,
      'NOTIFICATION_CREATED',
      'NOTIFICATION',
      notification.id,
      { title: dto.title, audience: dto.audience },
    );

    return notification;
  }

  /**
   * Get all notifications for a college (admin view)
   */
  async findAllForCollege(collegeId: string, query: QueryNotificationDto) {
    const { type, isActive, page = 1, limit = 20 } = query;

    const where: any = { collegeId };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { readReceipts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get notifications for a specific user (based on their role and department)
   */
  async findForUser(userId: string, collegeId: string, userRole: string, departmentId?: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        students: true,
        faculty_assignments: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build query based on user's role and department
    const orConditions: any[] = [
      { audience: 'ALL' },
    ];

    // Add role-based filters
    if (userRole === 'FACULTY' || userRole === 'COLLEGE_HOD') {
      orConditions.push({ audience: 'FACULTY' });
    }
    if (userRole === 'STUDENT') {
      orConditions.push({ audience: 'STUDENTS' });
      
      // Add batch filter for students
      if (user.students?.currentAcademicYear) {
        orConditions.push({
          audience: 'BATCH',
          academicYear: user.students.currentAcademicYear,
        });
      }
    }

    // Add department filter if user belongs to a department
    const userDepartmentIds: string[] = [];
    if (user.faculty_assignments && user.faculty_assignments.length > 0) {
      user.faculty_assignments.forEach(fa => userDepartmentIds.push(fa.departmentId));
    }
    if (departmentId) {
      userDepartmentIds.push(departmentId);
    }

    if (userDepartmentIds.length > 0) {
      orConditions.push({
        audience: 'DEPARTMENT',
        departmentId: { in: userDepartmentIds },
      });
    }

    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
        AND: {
          OR: orConditions,
        },
      },
      include: {
        creator: {
          select: { id: true, fullName: true },
        },
        department: {
          select: { id: true, name: true },
        },
        readReceipts: {
          where: { userId },
          select: { readAt: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    // Transform to include read status
    return notifications.map(n => ({
      ...n,
      isRead: n.readReceipts.length > 0,
      readAt: n.readReceipts[0]?.readAt || null,
      readReceipts: undefined,
    }));
  }

  /**
   * Get a single notification
   */
  async findOne(id: string, collegeId: string) {
    const notification = await this.prisma.notifications.findFirst({
      where: { id, collegeId },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { readReceipts: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Update a notification
   */
  async update(id: string, dto: UpdateNotificationDto, userId: string, collegeId: string) {
    const notification = await this.findOne(id, collegeId);

    const updated = await this.prisma.notifications.update({
      where: { id },
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type as any,
        priority: dto.priority as any,
        isActive: dto.isActive,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    await this.auditLogService.log(
      userId,
      'NOTIFICATION_UPDATED',
      'NOTIFICATION',
      id,
      { changes: dto },
    );

    return updated;
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string, collegeId: string) {
    await this.findOne(id, collegeId);

    await this.prisma.notifications.delete({
      where: { id },
    });

    await this.auditLogService.log(
      userId,
      'NOTIFICATION_DELETED',
      'NOTIFICATION',
      id,
      {},
    );

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string, collegeId: string) {
    // Verify notification exists and belongs to college
    await this.findOne(notificationId, collegeId);

    // Upsert read receipt
    await this.prisma.notification_reads.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: {
        notificationId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });

    return { message: 'Notification marked as read' };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, collegeId: string, userRole: string, departmentId?: string) {
    const notifications = await this.findForUser(userId, collegeId, userRole, departmentId);
    return {
      unreadCount: notifications.filter(n => !n.isRead).length,
      totalCount: notifications.length,
    };
  }

  /**
   * Deactivate expired notifications (can be called by a cron job)
   */
  async deactivateExpired() {
    const result = await this.prisma.notifications.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: {
        isActive: false,
      },
    });

    return { deactivatedCount: result.count };
  }
}
