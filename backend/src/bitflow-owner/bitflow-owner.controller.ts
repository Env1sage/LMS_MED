import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Put,
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BitflowOwnerService } from './bitflow-owner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  CreatePublisherDto,
  UpdatePublisherDto,
  UpdatePublisherStatusDto,
  PublisherResponseDto,
  PublisherDetailResponseDto,
} from './dto/publisher.dto';
import {
  CreateCollegeDto,
  UpdateCollegeDto,
  UpdateCollegeStatusDto,
  CollegeResponseDto,
  CollegeDetailResponseDto,
} from './dto/college.dto';
import {
  UpdateFeatureFlagsDto,
  UpdateSecurityPolicyDto,
  SecurityPolicyResponseDto,
} from './dto/feature-flags.dto';
import {
  GetAnalyticsDto,
  PlatformAnalyticsResponseDto,
  DashboardOverviewDto,
  ActivityTrendsDto,
  SubjectPopularityDto,
  CourseCompletionStatsDto,
} from './dto/analytics.dto';
import {
  GetAuditLogsDto,
  AuditLogsResponseDto,
} from './dto/audit.dto';

@Controller('bitflow-owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BITFLOW_OWNER)
export class BitflowOwnerController {
  constructor(private readonly bitflowOwnerService: BitflowOwnerService) {}

  // ========================================================================
  // PUBLISHER LIFECYCLE
  // ========================================================================

  @Post('publishers')
  @HttpCode(HttpStatus.CREATED)
  async createPublisher(
    @Body() dto: CreatePublisherDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PublisherResponseDto> {
    return this.bitflowOwnerService.createPublisher(dto, userId);
  }

  @Get('publishers')
  async getAllPublishers(): Promise<PublisherResponseDto[]> {
    return this.bitflowOwnerService.getAllPublishers();
  }

  @Get('publishers/:id')
  async getPublisherById(@Param('id') id: string): Promise<PublisherResponseDto> {
    return this.bitflowOwnerService.getPublisherById(id);
  }

  @Patch('publishers/:id/status')
  async updatePublisherStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePublisherStatusDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PublisherResponseDto> {
    return this.bitflowOwnerService.updatePublisherStatus(id, dto, userId);
  }

  @Post('publishers/:id/resend-credentials')
  async resendPublisherCredentials(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.bitflowOwnerService.resendPublisherCredentials(id, userId);
  }

  @Delete('publishers/:id')
  async deletePublisher(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.bitflowOwnerService.deletePublisher(id, userId);
  }

  // ========================================================================
  // COLLEGE LIFECYCLE
  // ========================================================================

  @Post('colleges')
  @HttpCode(HttpStatus.CREATED)
  async createCollege(
    @Body() dto: CreateCollegeDto,
    @CurrentUser('userId') userId: string,
  ): Promise<CollegeResponseDto> {
    return this.bitflowOwnerService.createCollege(dto, userId);
  }

  @Get('colleges')
  async getAllColleges(): Promise<CollegeResponseDto[]> {
    return this.bitflowOwnerService.getAllColleges();
  }

  @Get('colleges/:id')
  async getCollegeById(@Param('id') id: string): Promise<CollegeResponseDto> {
    return this.bitflowOwnerService.getCollegeById(id);
  }

  @Patch('colleges/:id/status')
  async updateCollegeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCollegeStatusDto,
    @CurrentUser('userId') userId: string,
  ): Promise<CollegeResponseDto> {
    return this.bitflowOwnerService.updateCollegeStatus(id, dto, userId);
  }

  @Post('colleges/:id/resend-credentials')
  async resendCollegeCredentials(
    @Param('id') id: string,
    @Body() body: { role: 'IT_ADMIN' | 'DEAN' },
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.bitflowOwnerService.resendCollegeCredentials(id, body.role, userId);
  }

  @Delete('colleges/:id')
  async deleteCollege(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.bitflowOwnerService.deleteCollege(id, userId);
  }

  // ========================================================================
  // SECURITY POLICY & FEATURE FLAGS
  // ========================================================================

  @Get('security-policy')
  async getSecurityPolicy(): Promise<SecurityPolicyResponseDto> {
    return this.bitflowOwnerService.getSecurityPolicy();
  }

  @Get('feature-flags')
  async getFeatureFlags(): Promise<SecurityPolicyResponseDto> {
    return this.bitflowOwnerService.getSecurityPolicy();
  }

  @Patch('security-policy')
  async updateSecurityPolicy(
    @Body() dto: UpdateSecurityPolicyDto,
    @CurrentUser('userId') userId: string,
  ): Promise<SecurityPolicyResponseDto> {
    return this.bitflowOwnerService.updateSecurityPolicy(dto, userId);
  }

  @Patch('feature-flags')
  async updateFeatureFlags(
    @Body() dto: UpdateFeatureFlagsDto,
    @CurrentUser('userId') userId: string,
  ): Promise<SecurityPolicyResponseDto> {
    return this.bitflowOwnerService.updateFeatureFlags(dto, userId);
  }

  // ========================================================================
  // PUBLISHER UPDATE
  // ========================================================================

  @Put('publishers/:id')
  async updatePublisher(
    @Param('id') id: string,
    @Body() dto: UpdatePublisherDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PublisherResponseDto> {
    return this.bitflowOwnerService.updatePublisher(id, dto, userId);
  }

  @Get('publishers/:id/details')
  async getPublisherDetails(@Param('id') id: string): Promise<PublisherDetailResponseDto> {
    return this.bitflowOwnerService.getPublisherById(id);
  }

  // ========================================================================
  // COLLEGE DETAILS & UPDATE
  // ========================================================================

  @Put('colleges/:id')
  async updateCollege(
    @Param('id') id: string,
    @Body() dto: UpdateCollegeDto,
    @CurrentUser('userId') userId: string,
  ): Promise<CollegeDetailResponseDto> {
    return this.bitflowOwnerService.updateCollege(id, dto, userId);
  }

  @Get('colleges/:id/details')
  async getCollegeDetails(@Param('id') id: string): Promise<CollegeDetailResponseDto> {
    return this.bitflowOwnerService.getCollegeDetails(id);
  }

  // ========================================================================
  // PLATFORM ANALYTICS (NON-PII)
  // ========================================================================

  @Get('analytics')
  async getPlatformAnalytics(
    @Query() dto: GetAnalyticsDto,
  ): Promise<PlatformAnalyticsResponseDto> {
    return this.bitflowOwnerService.getPlatformAnalytics(dto);
  }

  // ========================================================================
  // DASHBOARD & ACTIVITY TRENDS
  // ========================================================================

  @Get('dashboard')
  async getDashboardOverview(): Promise<DashboardOverviewDto> {
    return this.bitflowOwnerService.getDashboardOverview();
  }

  @Get('activity-trends')
  async getActivityTrends(@Query() dto: GetAnalyticsDto): Promise<ActivityTrendsDto> {
    return this.bitflowOwnerService.getActivityTrends(dto);
  }

  // ========================================================================
  // CONTRACT MANAGEMENT
  // ========================================================================

  @Post('check-expired-contracts')
  @HttpCode(HttpStatus.OK)
  async checkExpiredContracts(): Promise<{ expiredCount: number; expiredPublishers: string[] }> {
    return this.bitflowOwnerService.checkExpiredContracts();
  }

  // ========================================================================
  // SUBJECT POPULARITY & COURSE COMPLETION ANALYTICS
  // ========================================================================

  @Get('analytics/subject-popularity')
  async getSubjectPopularity(): Promise<SubjectPopularityDto> {
    return this.bitflowOwnerService.getSubjectPopularity();
  }

  @Get('analytics/course-completion')
  async getCourseCompletionStats(): Promise<CourseCompletionStatsDto> {
    return this.bitflowOwnerService.getCourseCompletionStats();
  }

  @Get('analytics/assessment-participation')
  async getAssessmentParticipation() {
    return this.bitflowOwnerService.getAssessmentParticipation();
  }

  // ========================================================================
  // STUDENT & TEACHER PERFORMANCE + COLLEGE COMPARISON
  // ========================================================================

  @Get('analytics/student-performance')
  async getStudentPerformance(
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bitflowOwnerService.getStudentPerformance({
      collegeId, courseId, limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('analytics/teacher-performance')
  async getTeacherPerformance(
    @Query('collegeId') collegeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bitflowOwnerService.getTeacherPerformance({
      collegeId, limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('analytics/course-performance')
  async getCoursePerformance(
    @Query('collegeId') collegeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bitflowOwnerService.getCoursePerformance({
      collegeId, limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('analytics/college-comparison')
  async getCollegeComparison() {
    return this.bitflowOwnerService.getCollegeComparison();
  }

  @Get('analytics/export/:reportType')
  async getExportData(
    @Param('reportType') reportType: string,
    @Query('collegeId') collegeId?: string,
    @Query('format') format?: string,
  ) {
    return this.bitflowOwnerService.getExportData(reportType, { collegeId, format });
  }

  // ========================================================================
  // AUDIT LOG VIEWER
  // ========================================================================

  @Get('audit-logs')
  async getAuditLogs(@Query() dto: GetAuditLogsDto): Promise<AuditLogsResponseDto> {
    return this.bitflowOwnerService.getAuditLogs(dto);
  }

  // ========================================================================
  // CONTENT MANAGEMENT - VIEW ALL PLATFORM CONTENT
  // ========================================================================

  @Get('content')
  async getAllContent(
    @Query('type') type?: string,
    @Query('publisherId') publisherId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bitflowOwnerService.getAllContent({
      type,
      publisherId,
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('content/stats')
  async getContentStats() {
    return this.bitflowOwnerService.getContentStats();
  }

  @Get('content/:id')
  async getContentById(@Param('id') id: string) {
    return this.bitflowOwnerService.getContentById(id);
  }

  @Patch('content/:id/status')
  async updateContentStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @CurrentUser('userId') userId: string,
  ) {
    return this.bitflowOwnerService.updateContentStatus(id, body.status, body.reason, userId);
  }

  @Get('mcqs')
  async getAllMcqs(
    @Query('publisherId') publisherId?: string,
    @Query('status') status?: string,
    @Query('subject') subject?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bitflowOwnerService.getAllMcqs({
      publisherId,
      status,
      subject,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('mcqs/:id')
  async getMcqById(@Param('id') id: string) {
    return this.bitflowOwnerService.getMcqById(id);
  }
}
