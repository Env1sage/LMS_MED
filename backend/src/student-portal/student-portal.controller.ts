import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StudentPortalService } from './student-portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('student-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  /**
   * Get student dashboard with today's agenda
   */
  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.studentPortalService.getDashboard(req.user.userId);
  }

  /**
   * Get all assigned tests
   */
  @Get('tests')
  async getMyTests(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.studentPortalService.getMyTests(req.user.userId, { status, type });
  }

  /**
   * Get test details before starting
   */
  @Get('tests/:testId')
  async getTestDetails(@Request() req: any, @Param('testId') testId: string) {
    return this.studentPortalService.getTestDetails(req.user.userId, testId);
  }

  /**
   * Start a test attempt
   */
  @Post('tests/:testId/start')
  async startTest(@Request() req: any, @Param('testId') testId: string) {
    return this.studentPortalService.startTestAttempt(
      req.user.userId,
      testId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  /**
   * Save answer during test
   */
  @Post('attempts/:attemptId/answer')
  async saveAnswer(
    @Request() req: any,
    @Param('attemptId') attemptId: string,
    @Body() body: { mcqId: string; answer: string | null; timeSpent: number },
  ) {
    return this.studentPortalService.saveAnswer(
      req.user.userId,
      attemptId,
      body.mcqId,
      body.answer,
      body.timeSpent,
    );
  }

  /**
   * Submit test attempt
   */
  @Post('attempts/:attemptId/submit')
  async submitAttempt(@Request() req: any, @Param('attemptId') attemptId: string) {
    return this.studentPortalService.submitAttempt(req.user.userId, attemptId);
  }

  /**
   * Get attempt results
   */
  @Get('attempts/:attemptId/results')
  async getAttemptResults(@Request() req: any, @Param('attemptId') attemptId: string) {
    return this.studentPortalService.getAttemptResults(req.user.userId, attemptId);
  }

  /**
   * Start practice session
   */
  @Post('practice/start')
  async startPractice(
    @Request() req: any,
    @Body() body: { subject?: string; topic?: string; count?: number },
  ) {
    return this.studentPortalService.startPracticeSession(req.user.userId, body);
  }

  /**
   * Submit practice answer
   */
  @Post('practice/:sessionId/answer')
  async submitPracticeAnswer(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { mcqId: string; answer: string; timeSpent: number },
  ) {
    return this.studentPortalService.submitPracticeAnswer(
      req.user.userId,
      sessionId,
      body.mcqId,
      body.answer,
      body.timeSpent,
    );
  }

  /**
   * Complete practice session
   */
  @Post('practice/:sessionId/complete')
  async completePractice(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.studentPortalService.completePracticeSession(req.user.userId, sessionId);
  }

  /**
   * Get my library (learning content)
   */
  @Get('library')
  async getMyLibrary(@Request() req: any) {
    return this.studentPortalService.getMyLibrary(req.user.userId);
  }

  /**
   * Get personal analytics
   */
  @Get('analytics')
  async getMyAnalytics(@Request() req: any) {
    return this.studentPortalService.getMyAnalytics(req.user.userId);
  }

  /**
   * Get schedule/timetable
   */
  @Get('schedule')
  async getMySchedule(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.studentPortalService.getMySchedule(req.user.userId, start, end);
  }
}
