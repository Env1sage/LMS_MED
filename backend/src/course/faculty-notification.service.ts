import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

const MAX_DAILY_NOTIFICATIONS = 3;

@Injectable()
export class FacultyNotificationService {
  constructor(private prisma: PrismaService) {}

  /** Send a notification (with daily limit of 3) */
  async sendNotification(facultyId: string, collegeId: string, dto: any) {
    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await this.prisma.notifications.count({
      where: {
        createdBy: facultyId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    if (todayCount >= MAX_DAILY_NOTIFICATIONS) {
      throw new BadRequestException(
        `Daily notification limit reached (${MAX_DAILY_NOTIFICATIONS}/day). You have already sent ${todayCount} notifications today.`
      );
    }

    // Validate
    if (!dto.title || dto.title.length < 3) throw new BadRequestException('Title must be at least 3 characters');
    if (!dto.message || dto.message.length < 10) throw new BadRequestException('Message must be at least 10 characters');

    const notification = await this.prisma.notifications.create({
      data: {
        id: uuidv4(),
        collegeId,
        createdBy: facultyId,
        title: dto.title,
        message: dto.message,
        type: dto.type || 'ANNOUNCEMENT',
        priority: dto.priority || 'NORMAL',
        audience: dto.audience || 'STUDENTS',
        departmentId: dto.departmentId || null,
        academicYear: dto.academicYear || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    const remaining = MAX_DAILY_NOTIFICATIONS - todayCount - 1;

    return {
      notification,
      dailyLimit: {
        used: todayCount + 1,
        remaining,
        max: MAX_DAILY_NOTIFICATIONS,
      },
    };
  }

  /** Get daily limit info */
  async getDailyLimit(facultyId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await this.prisma.notifications.count({
      where: {
        createdBy: facultyId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    return {
      used: todayCount,
      remaining: Math.max(0, MAX_DAILY_NOTIFICATIONS - todayCount),
      max: MAX_DAILY_NOTIFICATIONS,
    };
  }

  /** Get notifications sent by this faculty */
  async getSentNotifications(facultyId: string) {
    const notifications = await this.prisma.notifications.findMany({
      where: { createdBy: facultyId },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { readReceipts: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      audience: n.audience,
      department: n.department,
      academicYear: n.academicYear,
      readCount: n._count.readReceipts,
      isActive: n.isActive,
      createdAt: n.createdAt,
      expiresAt: n.expiresAt,
    }));
  }
}
