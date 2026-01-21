import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { SubmitProgressDto } from './dto/submit-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';

@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(
    private readonly progressService: ProgressService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Check if student can access a specific step
   */
  @Get('check-access/:stepId')
  @Roles(UserRole.STUDENT)
  async checkAccess(@Request() req: any, @Param('stepId') stepId: string) {
    return this.progressService.checkStepAccess(req.user.userId, stepId);
  }

  /**
   * Submit progress for a learning step
   */
  @Post('submit')
  @Roles(UserRole.STUDENT)
  async submitProgress(@Request() req: any, @Body() dto: SubmitProgressDto) {
    try {
      const progress = await this.progressService.submitProgress(req.user.userId, dto);

      // Log step completion if completed
      if (progress.completionPercent >= 100) {
        await this.auditLogService.logStepCompleted(
          req.user.userId,
          dto.learning_flow_stepsId,
          progress.courseId,
          progress.completionPercent,
          req.ip,
          req.headers['user-agent'],
        );
      }

      return progress;
    } catch (error) {
      // Log invalid completion attempt
      if (error instanceof Error) {
        await this.auditLogService.logInvalidCompletion(
          req.user.userId,
          dto.learning_flow_stepsId,
          error.message,
          req.ip,
          req.headers['user-agent'],
        );
      }
      throw error;
    }
  }

  /**
   * Get student's progress for a course
   */
  @Get('course/:courseId')
  @Roles(UserRole.STUDENT)
  async getCourseProgress(@Request() req: any, @Param('courseId') courseId: string) {
    return this.progressService.getCourseProgress(req.user.userId, courseId);
  }

  /**
   * Get all assigned courses for student
   */
  @Get('my-courses')
  @Roles(UserRole.STUDENT)
  async getMyCourses(@Request() req: any) {
    return this.progressService.getStudentCourses(req.user.userId);
  }
}
