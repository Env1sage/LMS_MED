import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Put,
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

  // ========================================================================
  // SECURITY POLICY & FEATURE FLAGS
  // ========================================================================

  @Get('security-policy')
  async getSecurityPolicy(): Promise<SecurityPolicyResponseDto> {
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
  // AUDIT LOG VIEWER
  // ========================================================================

  @Get('audit-logs')
  async getAuditLogs(@Query() dto: GetAuditLogsDto): Promise<AuditLogsResponseDto> {
    return this.bitflowOwnerService.getAuditLogs(dto);
  }
}
