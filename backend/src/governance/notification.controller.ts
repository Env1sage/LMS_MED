import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, UpdateNotificationDto, QueryNotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@Controller('governance/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Create a new notification/announcement
   * Only College Admin, Dean, or HOD can create
   */
  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationService.create(dto, user.userId, user.collegeId);
  }

  /**
   * Get all notifications for the college (admin view)
   */
  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.findAllForCollege(user.collegeId, query);
  }

  /**
   * Get notifications for current user (based on their role)
   */
  @Get('my-notifications')
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.COLLEGE_DEAN,
    UserRole.COLLEGE_HOD,
    UserRole.FACULTY,
    UserRole.STUDENT,
  )
  async getMyNotifications(@CurrentUser() user: any) {
    return this.notificationService.findForUser(
      user.userId,
      user.collegeId,
      user.role,
      user.departmentId,
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.COLLEGE_DEAN,
    UserRole.COLLEGE_HOD,
    UserRole.FACULTY,
    UserRole.STUDENT,
  )
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(
      user.userId,
      user.collegeId,
      user.role,
      user.departmentId,
    );
  }

  /**
   * Get a single notification
   */
  @Get(':id')
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.COLLEGE_DEAN,
    UserRole.COLLEGE_HOD,
    UserRole.FACULTY,
    UserRole.STUDENT,
  )
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationService.findOne(id, user.collegeId);
  }

  /**
   * Update a notification
   */
  @Put(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, dto, user.userId, user.collegeId);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationService.delete(id, user.userId, user.collegeId);
  }

  /**
   * Mark a notification as read
   */
  @Post(':id/read')
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.COLLEGE_DEAN,
    UserRole.COLLEGE_HOD,
    UserRole.FACULTY,
    UserRole.STUDENT,
  )
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, user.userId, user.collegeId);
  }
}
