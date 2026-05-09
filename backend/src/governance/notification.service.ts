import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { EmailService } from '../email/email.service';
import { CreateNotificationDto, UpdateNotificationDto, QueryNotificationDto, NotificationAudience } from './dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';

// Allowed HTML subset for notification messages: basic formatting only, no scripts/iframes
const NOTIFICATION_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li'],
  allowedAttributes: {},
};

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
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
        title: sanitizeHtml(dto.title, { allowedTags: [], allowedAttributes: {} }),
        message: sanitizeHtml(dto.message, NOTIFICATION_SANITIZE_OPTIONS),
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

    // Fire-and-forget: send emails to target audience
    this.dispatchNotificationEmails(notification, collegeId).catch(err =>
      console.error('Notification email dispatch error:', err)
    );

    return notification;
  }

  /**
   * Look up users in the notification audience and send bulk emails
   */
  private async dispatchNotificationEmails(notification: any, collegeId: string): Promise<void> {
    try {
      // Build user filter based on audience
      const userWhere: any = { collegeId };
      const audience = notification.audience;

      if (audience === 'FACULTY') {
        userWhere.role = { in: ['FACULTY', 'COLLEGE_HOD'] };
      } else if (audience === 'STUDENTS') {
        userWhere.role = 'STUDENT';
      } else if (audience === 'DEPARTMENT' && notification.departmentId) {
        // Faculty in the department
        userWhere.faculty_assignments = { some: { departmentId: notification.departmentId } };
      } else if (audience === 'BATCH' && notification.academicYear) {
        // Students in the specified batch
        userWhere.role = 'STUDENT';
        userWhere.students = { currentAcademicYear: notification.academicYear };
      }
      // ALL → no extra filter (all college users)

      const users = await this.prisma.users.findMany({
        where: userWhere,
        select: { email: true, fullName: true },
        take: 500, // cap batch size
      });

      if (users.length === 0) return;

      // Get college name for email context
      const college = await this.prisma.colleges.findUnique({
        where: { id: collegeId },
        select: { name: true },
      });

      await this.emailService.sendBulkNotificationEmails({
        recipients: users.map(u => ({ email: u.email, fullName: u.fullName || 'User' })),
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'NORMAL',
        audience: notification.audience,
        senderName: notification.creator?.fullName || 'College Administration',
        collegeName: college?.name,
      });
    } catch (err) {
      console.error('Failed to dispatch notification emails:', err);
    }
  }

  /**
   * Get all notifications for a college (admin view — shows only what the current user created)
   */
  async findAllForCollege(collegeId: string, userId: string, query: QueryNotificationDto) {
    const { type, isActive, page = 1, limit = 20 } = query;

    const where: any = { collegeId, createdBy: userId };
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
        title: dto.title ? sanitizeHtml(dto.title, { allowedTags: [], allowedAttributes: {} }) : undefined,
        message: dto.message ? sanitizeHtml(dto.message, NOTIFICATION_SANITIZE_OPTIONS) : undefined,
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
