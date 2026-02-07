import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CourseAnalyticsService } from './course-analytics.service';

@Controller('governance/course-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseAnalyticsController {
  constructor(private readonly courseAnalyticsService: CourseAnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.BITFLOW_OWNER)
  async getCourseAnalyticsOverview(
    @Query('collegeId') collegeId?: string,
  ) {
    try {
      return await this.courseAnalyticsService.getCourseAnalyticsOverview(collegeId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch course analytics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('course-comparison')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.BITFLOW_OWNER, UserRole.FACULTY)
  async getCourseComparison(
    @Query('collegeId') collegeId?: string,
    @Request() req?: any,
  ) {
    try {
      const userId = req?.user?.userId;
      const userRole = req?.user?.role;
      
      // Faculty users should only see their own courses
      const facultyId = userRole === UserRole.FACULTY ? userId : undefined;
      
      return await this.courseAnalyticsService.getCourseComparison(collegeId, facultyId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch course comparison',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('course-details')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.BITFLOW_OWNER)
  async getCourseDetails(
    @Query('courseId') courseId: string,
  ) {
    try {
      if (!courseId) {
        throw new HttpException('Course ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.courseAnalyticsService.getCourseDetails(courseId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch course details',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
