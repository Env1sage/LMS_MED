import {
  Controller, Get, Post, Body, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { FacultyNotificationService } from './faculty-notification.service';

@Controller('faculty/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACULTY)
export class FacultyNotificationController {
  constructor(private readonly svc: FacultyNotificationService) {}

  /** Send a notification to students (max 3/day) */
  @Post('send')
  async sendNotification(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.sendNotification(user.userId, user.collegeId, body);
  }

  /** Get remaining sends for today */
  @Get('daily-limit')
  async getDailyLimit(@CurrentUser() user: any) {
    return this.svc.getDailyLimit(user.userId);
  }

  /** Get notifications sent by this teacher */
  @Get('sent')
  async getSentNotifications(@CurrentUser() user: any) {
    return this.svc.getSentNotifications(user.userId);
  }
}
