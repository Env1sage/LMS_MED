import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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

  /**
   * Get comprehensive weekly calendar with all events, deadlines, notifications
   */
  @Get('calendar/week')
  async getWeekCalendar(
    @Request() req: any,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    return this.studentPortalService.getWeekCalendar(req.user.userId, targetDate);
  }

  @Get('calendar/month')
  async getMonthCalendar(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.studentPortalService.getMonthCalendar(req.user.userId, y, m);
  }

  /**
   * Get student notifications (all types)
   */
  @Get('notifications')
  async getMyNotifications(@Request() req: any) {
    return this.studentPortalService.getStudentNotifications(req.user.userId);
  }

  /**
   * Get unread notification count
   */
  @Get('notifications/unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.studentPortalService.getUnreadNotificationCount(req.user.userId);
  }

  /**
   * Mark notification as read
   */
  @Post('notifications/:notificationId/read')
  async markNotificationRead(
    @Request() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    return this.studentPortalService.markNotificationRead(req.user.userId, notificationId);
  }

  /**
   * Mark all notifications as read
   */
  @Post('notifications/read-all')
  async markAllNotificationsRead(@Request() req: any) {
    return this.studentPortalService.markAllNotificationsRead(req.user.userId);
  }

  /**
   * Rate a course
   */
  @Post('courses/:courseId/rate')
  async rateCourse(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Body() body: { rating: number; feedback?: string },
  ) {
    return this.studentPortalService.rateCourse(req.user.userId, courseId, body.rating, body.feedback);
  }

  // ─── Library Management ─────────────────────────────────────

  /** Get library v2 (persistent + course content) */
  @Get('library-v2')
  async getMyLibraryV2(@Request() req: any) {
    return this.studentPortalService.getMyLibraryV2(req.user.userId);
  }

  /** Add course content to library (after completion prompt) */
  @Post('library/add-course')
  async addCourseToLibrary(
    @Request() req: any,
    @Body() body: { courseId: string },
  ) {
    return this.studentPortalService.addCourseToLibrary(req.user.userId, body.courseId);
  }

  /** Remove item from library */
  @Post('library/:libraryId/remove')
  async removeFromLibrary(
    @Request() req: any,
    @Param('libraryId') libraryId: string,
  ) {
    return this.studentPortalService.removeFromLibrary(req.user.userId, libraryId);
  }

  /** Check course completion status (for library prompt) */
  @Get('courses/:courseId/completion')
  async getCourseCompletion(
    @Request() req: any,
    @Param('courseId') courseId: string,
  ) {
    return this.studentPortalService.getCourseCompletionStatus(req.user.userId, courseId);
  }

  // ─── Assignment-specific ────────────────────────────────────

  /** Get only assignments (MCQ-based) */
  @Get('assignments')
  async getMyAssignments(@Request() req: any) {
    return this.studentPortalService.getMyAssignments(req.user.userId);
  }

  // ─── EBooks & Videos ────────────────────────────────────────

  /** Get ebooks accessible to the student */
  @Get('ebooks')
  async getEbooks(@Request() req: any) {
    return this.studentPortalService.getEbooks(req.user.userId);
  }

  /** Save ebook to student library */
  @Post('ebooks/:bookId/save-to-library')
  @HttpCode(HttpStatus.OK)
  async saveEbookToLibrary(
    @Request() req: any,
    @Param('bookId') bookId: string,
    @Body() body: { type?: string; title?: string; metadata?: any },
  ) {
    return this.studentPortalService.saveItemToLibrary(
      req.user.userId, bookId, body.type || 'EBOOK', body.title || 'E-Book',
    );
  }

  /** Get videos accessible to the student */
  @Get('videos')
  async getVideos(@Request() req: any) {
    return this.studentPortalService.getVideos(req.user.userId);
  }

  /** Save video to student library */
  @Post('videos/:videoId/save-to-library')
  @HttpCode(HttpStatus.OK)
  async saveVideoToLibrary(
    @Request() req: any,
    @Param('videoId') videoId: string,
    @Body() body: { type?: string; title?: string; metadata?: any },
  ) {
    return this.studentPortalService.saveItemToLibrary(
      req.user.userId, videoId, body.type || 'VIDEO', body.title || 'Video',
    );
  }

  /** Generic save-to-library for other content types */
  @Post('library/save')
  @HttpCode(HttpStatus.OK)
  async saveToLibrary(
    @Request() req: any,
    @Body() body: { itemId: string; type: string; title: string; subject?: string },
  ) {
    return this.studentPortalService.saveItemToLibrary(
      req.user.userId, body.itemId, body.type, body.title, body.subject,
    );
  }

  // ─── Library Folders ────────────────────────────────────────

  /** Get custom folders (no persistent DB — returns empty list) */
  @Get('library/folders')
  async getLibraryFolders(@Request() req: any) {
    return this.studentPortalService.getLibraryFolders(req.user.userId);
  }

  /** Create a custom folder (client-side managed; backend acknowledges) */
  @Post('library/folders')
  @HttpCode(HttpStatus.OK)
  async createLibraryFolder(@Body() body: any) {
    return { success: true, folder: body };
  }

  /** Delete a custom folder */
  @Delete('library/folders/:folderId')
  @HttpCode(HttpStatus.OK)
  async deleteLibraryFolder(@Param('folderId') _folderId: string) {
    return { success: true };
  }

  /** Get books/videos from the college's subscribed packages, year-filtered */
  @Get('library/packages')
  async getPackageLibrary(@Request() req: any) {
    return this.studentPortalService.getPackageLibrary(req.user.userId);
  }
}
