import { Controller, Get, Post, Param, Query, Req, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FacultyAnalyticsService } from './faculty-analytics.service';
import type { Response } from 'express';

@Controller('faculty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACULTY)
export class FacultyAnalyticsController {
  constructor(private readonly facultyAnalyticsService: FacultyAnalyticsService) {}

  /**
   * Get faculty dashboard overview
   */
  @Get('dashboard')
  async getDashboardOverview(@Req() req: any) {
    return this.facultyAnalyticsService.getDashboardOverview(req.user.id);
  }

  /**
   * Get all students enrolled in faculty's courses
   */
  @Get('students')
  async getAllStudents(
    @Req() req: any,
    @Query('filter') filter?: 'all' | 'active' | 'assigned',
  ) {
    return this.facultyAnalyticsService.getAllStudents(req.user.id, filter);
  }

  /**
   * Get detailed analytics for a course
   */
  @Get('courses/:courseId/analytics')
  async getCourseAnalytics(
    @Req() req: any,
    @Param('courseId') courseId: string,
  ) {
    return this.facultyAnalyticsService.getCourseAnalytics(req.user.id, courseId);
  }

  /**
   * Get batch-wise summary for a course
   */
  @Get('courses/:courseId/batch-summary')
  async getBatchSummary(
    @Req() req: any,
    @Param('courseId') courseId: string,
  ) {
    return this.facultyAnalyticsService.getBatchSummary(req.user.id, courseId);
  }

  /**
   * Get MCQ analytics for a course
   */
  @Get('courses/:courseId/mcq-analytics')
  async getMcqAnalytics(
    @Req() req: any,
    @Param('courseId') courseId: string,
  ) {
    return this.facultyAnalyticsService.getMcqAnalytics(req.user.id, courseId);
  }

  /**
   * Get individual student progress in a course
   */
  @Get('courses/:courseId/students/:studentId')
  async getStudentProgress(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.facultyAnalyticsService.getStudentProgress(req.user.id, courseId, studentId);
  }

  /**
   * Generate and download report (JSON format)
   */
  @Get('courses/:courseId/report')
  async generateReport(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Query('format') format: 'summary' | 'detailed' = 'summary',
  ) {
    return this.facultyAnalyticsService.generateReport(req.user.id, courseId, format);
  }

  /**
   * Download CSV report
   */
  @Get('courses/:courseId/report/csv')
  async downloadCsvReport(
    @Req() req: any,
    @Res() res: Response,
    @Param('courseId') courseId: string,
  ) {
    const report = await this.facultyAnalyticsService.generateReport(
      req.user.id,
      courseId,
      'detailed',
    );

    // Generate CSV content
    const csvHeaders = [
      'Student Name',
      'Enrollment Number',
      'Email',
      'Academic Year',
      'Status',
      'Progress %',
      'Completed Steps',
      'Total Steps',
      'Time Spent (minutes)',
      'Last Activity',
      'Assigned Date',
    ];

    const csvRows = (report.studentDetails || []).map((student: any) => [
      student.studentName,
      student.enrollmentNumber,
      student.email,
      student.academicYear,
      student.status,
      student.progressPercent,
      student.completedSteps,
      student.totalSteps,
      Math.round(student.totalTimeSpent / 60),
      student.lastActivity ? new Date(student.lastActivity).toISOString() : 'N/A',
      new Date(student.assignedAt).toISOString(),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="course-report-${courseId}-${Date.now()}.csv"`,
    );
    res.send(csvContent);
  }
}
