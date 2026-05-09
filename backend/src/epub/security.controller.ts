import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';
import { randomUUID } from 'crypto';

interface TamperDetectionDto {
  learningUnitId: string;
  chapterId: string;
  deviceId: string;
  tamperType?: string;
}

@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private generateUUID(): string {
    return randomUUID();
  }

  /**
   * Handle tamper detection event
   * Logs the incident, increments counter, and creates admin alert
   */
  @Post('tamper-detected')
  async handleTamperDetection(
    @Body() dto: TamperDetectionDto,
    @Req() req: Request,
  ) {
    try {
      // Extract user from token
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.userId || decoded.sub;

      this.logger.warn(
        `🚨 TAMPER DETECTED: User ${userId}, Device ${dto.deviceId}, Chapter ${dto.chapterId}`,
      );

      // Find existing access log
      const accessLog = await this.prisma.learning_unit_access_logs.findFirst({
        where: {
          userId,
          learningUnitId: dto.learningUnitId,
          chapterId: dto.chapterId,
          deviceId: dto.deviceId,
          sessionEnded: null,
        },
        orderBy: { sessionStarted: 'desc' },
      });

      if (accessLog) {
        // Increment tamper attempts
        await this.prisma.learning_unit_access_logs.update({
          where: { id: accessLog.id },
          data: {
            tamperAttempts: { increment: 1 },
            suspicious: true,
            violationDetected: true,
            violationType: dto.tamperType || 'WATERMARK_TAMPERING',
          },
        });
      }

      // Get user details for admin notification
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          students: true,
        },
      });

      const userName = user?.fullName || 'Unknown';
      const userRole = user?.role || 'UNKNOWN';
      const collegeId = user?.collegeId;

      // Create audit log entry
      await this.prisma.audit_logs.create({
        data: {
          id: this.generateUUID(),
          userId,
          collegeId: collegeId || null,
          action: 'SECURITY_VIOLATION',
          entityType: 'WATERMARK',
          entityId: dto.chapterId,
          metadata: {
            event: 'tamper_detected',
            deviceId: dto.deviceId,
            learningUnitId: dto.learningUnitId,
            chapterId: dto.chapterId,
            tamperType: dto.tamperType || 'WATERMARK_TAMPERING',
            userName,
            userRole,
          },
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      // Create admin notifications
      await this.createAdminNotifications(
        userId,
        userName,
        userRole,
        collegeId || null,
        dto,
      );

      this.logger.log(
        `Tamper event logged for user ${userId}, notifications sent`,
      );

      return {
        success: true,
        message: 'Security violation logged',
        action: 'SESSION_TERMINATED',
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle tamper detection: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid session');
    }
  }

  /**
   * Create notifications for Bitflow Owner and College Admin
   */
  private async createAdminNotifications(
    userId: string,
    userName: string,
    userRole: string,
    collegeId: string | null,
    dto: TamperDetectionDto,
  ) {
    try {
      // Find Bitflow Owner(s)
      const owners = await this.prisma.users.findMany({
        where: { role: 'BITFLOW_OWNER' },
      });

      // Find College Admin if applicable
      let collegeAdmins: any[] = [];
      if (collegeId) {
        collegeAdmins = await this.prisma.users.findMany({
          where: {
            role: 'COLLEGE_ADMIN',
            collegeId,
          },
        });
      }

      const recipients = [...owners, ...collegeAdmins];

      // Create notifications for each admin
      for (const admin of recipients) {
        await this.prisma.notifications.create({
          data: {
            collegeId: collegeId || admin.collegeId || '',
            createdBy: userId,
            title: '🚨 Security Alert: Watermark Tampering Detected',
            message: `User ${userName} (${userRole}) attempted to tamper with content watermark on ${dto.learningUnitId}. Device: ${dto.deviceId.substring(0, 8)}... Chapter: ${dto.chapterId}`,
            type: 'SYSTEM_ALERT',
            priority: 'HIGH',
          },
        });
      }

      this.logger.log(
        `Created ${recipients.length} admin notifications for tamper event`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create admin notifications: ${error.message}`,
      );
      // Don't throw - notification failure shouldn't block tamper logging
    }
  }

  /**
   * Get tamper statistics for admin dashboard
   */
  @Post('tamper-stats')
  async getTamperStats(@Req() req: Request) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException();
      }

      const decoded = this.jwtService.verify(token);
      const userRole = decoded.role;

      // Only allow admins
      if (!['BITFLOW_OWNER', 'COLLEGE_ADMIN'].includes(userRole)) {
        throw new UnauthorizedException('Insufficient permissions');
      }

      // Get suspicious access logs
      const suspiciousLogs = await this.prisma.learning_unit_access_logs.findMany({
        where: { suspicious: true },
        orderBy: { sessionStarted: 'desc' },
        take: 50,
        include: {
          learning_units: {
            select: {
              title: true,
            },
          },
        },
      });

      // Get tamper count by user
      const tampersByUser = await this.prisma.learning_unit_access_logs.groupBy({
        by: ['userId'],
        where: {
          suspicious: true,
        },
        _count: {
          userId: true,
        },
        _sum: {
          tamperAttempts: true,
        },
      });

      return {
        suspiciousLogs,
        tampersByUser,
        totalIncidents: suspiciousLogs.length,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid session');
    }
  }
}
