import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
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
  SecurityPolicyResponseDto
} from './dto/feature-flags.dto';
import {
  GetAnalyticsDto,
  PlatformAnalyticsResponseDto,
  AnalyticsPeriod,
  DashboardOverviewDto,
  ActivityTrendsDto,
  SubjectPopularityDto,
  CourseCompletionStatsDto,
} from './dto/analytics.dto';
import {
  GetAuditLogsDto,
  AuditLogsResponseDto,
  AuditLogResponseDto
} from './dto/audit.dto';
import { PublisherStatus, CollegeStatus, AuditAction, UserRole, ContentStatus, CompetencyMappingStatus } from '@prisma/client';

@Injectable()
export class BitflowOwnerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ========================================================================
  // PUBLISHER LIFECYCLE MANAGEMENT
  // ========================================================================

  async createPublisher(dto: CreatePublisherDto, bitflowOwnerId: string): Promise<PublisherResponseDto> {
    // Check if code already exists
    const existing = await this.prisma.publishers.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Publisher with code '${dto.code}' already exists`);
    }

    const publisher = await this.prisma.publishers.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        name: dto.name,
        code: dto.code,
        status: PublisherStatus.ACTIVE,
        // Phase 2: Contract management fields
        legalName: dto.legalName,
        contactPerson: dto.contactPerson,
        contactEmail: dto.contactEmail,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : null,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
      },
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.PUBLISHER_CREATED,
      entityType: 'Publisher',
      entityId: publisher.id,
      description: `Publisher '${publisher.name}' (${publisher.code}) created`,
      publisherId: publisher.id,
    });

    return this.mapPublisherToDto(publisher);
  }

  // Phase 2: Update publisher details
  async updatePublisher(id: string, dto: UpdatePublisherDto, bitflowOwnerId: string): Promise<PublisherResponseDto> {
    const publisher = await this.prisma.publishers.findUnique({
      where: { id },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher with ID '${id}' not found`);
    }

    const updated = await this.prisma.publishers.update({
      where: { id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        contactPerson: dto.contactPerson,
        contactEmail: dto.contactEmail,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
        contractDocument: dto.contractDocument,
      },
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.PUBLISHER_UPDATED,
      entityType: 'Publisher',
      entityId: id,
      description: `Publisher '${updated.name}' updated`,
      publisherId: id,
      metadata: dto,
    });

    return this.mapPublisherToDto(updated);
  }

  async getAllPublishers(): Promise<PublisherResponseDto[]> {
    const publishers = await this.prisma.publishers.findMany({
      include: {
        _count: {
          select: { 
            users: true,
            learning_units: true,
            mcqs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return publishers.map(p => ({
      ...this.mapPublisherToDto(p),
      adminCount: p._count.users,
      contentCount: p._count.learning_units + p._count.mcqs,
      isContractExpired: p.contractEndDate ? new Date(p.contractEndDate) < new Date() : false,
    }));
  }

  async getPublisherById(id: string): Promise<PublisherDetailResponseDto> {
    const publisher = await this.prisma.publishers.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, learning_units: true, mcqs: true },
        },
        learning_units: {
          select: {
            type: true,
            competencyMappingStatus: true,
          },
        },
      },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher with ID '${id}' not found`);
    }

    // Calculate content stats by type
    const contentStats = {
      books: publisher.learning_units.filter(lu => lu.type === 'BOOK').length,
      videos: publisher.learning_units.filter(lu => lu.type === 'VIDEO').length,
      mcqs: publisher._count.mcqs,
      notes: publisher.learning_units.filter(lu => lu.type === 'NOTES').length,
    };

    // Calculate competency mapping stats
    const competencyMappingStats = {
      complete: publisher.learning_units.filter(lu => lu.competencyMappingStatus === 'COMPLETE').length,
      partial: publisher.learning_units.filter(lu => lu.competencyMappingStatus === 'PARTIAL').length,
      pending: publisher.learning_units.filter(lu => lu.competencyMappingStatus === 'PENDING').length,
    };

    // Count colleges using this publisher's content (via learning flow steps)
    const collegesUsingContent = await this.prisma.courses.findMany({
      where: {
        learning_flow_steps: {
          some: {
            learning_units: {
              publisherId: id,
            },
          },
        },
      },
      select: { collegeId: true },
      distinct: ['collegeId'],
    });

    return {
      ...this.mapPublisherToDto(publisher),
      adminCount: publisher._count.users,
      contentStats,
      competencyMappingStats,
      collegesUsingContent: collegesUsingContent.length,
    };
  }

  async updatePublisherStatus(
    id: string,
    dto: UpdatePublisherStatusDto,
    bitflowOwnerId: string,
  ): Promise<PublisherResponseDto> {
    const publisher = await this.prisma.publishers.findUnique({
      where: { id },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher with ID '${id}' not found`);
    }

    const updated = await this.prisma.publishers.update({
      where: { id },
      data: { status: dto.status },
    });

    // Log the action
    const action = dto.status === PublisherStatus.SUSPENDED 
      ? AuditAction.PUBLISHER_SUSPENDED 
      : AuditAction.PUBLISHER_ACTIVATED;

    await this.auditService.log({
      userId: bitflowOwnerId,
      action,
      entityType: 'Publisher',
      entityId: id,
      description: `Publisher '${publisher.name}' status changed to ${dto.status}`,
      publisherId: id,
    });

    // If suspended, invalidate all associated user sessions
    if (dto.status === PublisherStatus.SUSPENDED) {
      await this.invalidatePublisherSessions(id);
    }

    return this.mapPublisherToDto(updated);
  }

  private async invalidatePublisherSessions(publisherId: string): Promise<void> {
    // Get all users from this publisher
    const users = await this.prisma.users.findMany({
      where: { publisherId },
      select: { id: true },
    });

    const userIds = users.map(u => u.id);

    // Revoke all refresh tokens
    await this.prisma.refresh_tokens.updateMany({
      where: { userId: { in: userIds } },
      data: { isRevoked: true },
    });

    // Deactivate all sessions
    await this.prisma.user_sessions.updateMany({
      where: { userId: { in: userIds } },
      data: { isActive: false },
    });
  }

  // ========================================================================
  // COLLEGE LIFECYCLE MANAGEMENT
  // ========================================================================

  async createCollege(dto: CreateCollegeDto, bitflowOwnerId: string): Promise<CollegeResponseDto> {
    // Check if code already exists
    const existing = await this.prisma.colleges.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`College with code '${dto.code}' already exists`);
    }

    // Generate email domain from college code if not provided
    const emailDomain = dto.emailDomain || `${dto.code.toLowerCase()}.edu.in`;

    const college = await this.prisma.colleges.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        name: dto.name,
        code: dto.code,
        status: CollegeStatus.ACTIVE,
        emailDomain,
        adminContactEmail: dto.adminContactEmail,
        address: dto.address,
        city: dto.city,
        state: dto.state,
      },
    });

    // Phase 2: Auto-create IT Admin and Dean accounts
    const defaultPassword = 'Welcome@123'; // Users must change on first login
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create IT Admin account
    const itAdminEmail = `itadmin@${emailDomain}`;
    const itAdmin = await this.prisma.users.create({
      data: {
        id: uuidv4(),
        email: itAdminEmail,
        passwordHash: hashedPassword,
        fullName: `IT Admin - ${dto.name}`,
        role: UserRole.COLLEGE_ADMIN,
        status: 'ACTIVE',
        collegeId: college.id,
        updatedAt: new Date(),
      },
    });

    // Create Dean account
    const deanEmail = `dean@${emailDomain}`;
    const dean = await this.prisma.users.create({
      data: {
        id: uuidv4(),
        email: deanEmail,
        passwordHash: hashedPassword,
        fullName: `Dean - ${dto.name}`,
        role: UserRole.COLLEGE_DEAN,
        status: 'ACTIVE',
        collegeId: college.id,
        updatedAt: new Date(),
      },
    });

    // Log college creation
    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.COLLEGE_CREATED,
      entityType: 'College',
      entityId: college.id,
      description: `College '${college.name}' (${college.code}) created with IT Admin (${itAdminEmail}) and Dean (${deanEmail})`,
      collegeId: college.id,
      metadata: {
        itAdminId: itAdmin.id,
        itAdminEmail,
        deanId: dean.id,
        deanEmail,
        defaultPasswordSet: true,
      },
    });

    // Log user creations
    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: itAdmin.id,
      description: `IT Admin account created for college '${college.name}'`,
      collegeId: college.id,
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: dean.id,
      description: `Dean account created for college '${college.name}'`,
      collegeId: college.id,
    });

    return {
      ...this.mapCollegeToDto(college),
      createdAccounts: {
        itAdmin: { email: itAdminEmail, role: 'COLLEGE_ADMIN' },
        dean: { email: deanEmail, role: 'DEAN' },
        defaultPassword: defaultPassword,
      },
    } as CollegeResponseDto;
  }

  async getAllColleges(): Promise<CollegeResponseDto[]> {
    const colleges = await this.prisma.colleges.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return colleges.map(c => ({
      ...this.mapCollegeToDto(c),
      userCount: c._count.users,
    }));
  }

  async getCollegeById(id: string): Promise<CollegeResponseDto> {
    const college = await this.prisma.colleges.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!college) {
      throw new NotFoundException(`College with ID '${id}' not found`);
    }

    return {
      ...this.mapCollegeToDto(college),
      userCount: college._count.users,
    };
  }

  async updateCollege(
    id: string,
    dto: UpdateCollegeDto,
    bitflowOwnerId: string,
  ): Promise<CollegeDetailResponseDto> {
    const college = await this.prisma.colleges.findUnique({
      where: { id },
    });

    if (!college) {
      throw new NotFoundException(`College with ID '${id}' not found`);
    }

    const updated = await this.prisma.colleges.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        emailDomain: dto.emailDomain,
        adminContactEmail: dto.adminContactEmail,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    // Log the action
    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.COLLEGE_UPDATED,
      entityType: 'College',
      entityId: id,
      description: `College '${college.name}' updated`,
      collegeId: id,
    });

    return this.getCollegeDetails(id);
  }

  async updateCollegeStatus(
    id: string,
    dto: UpdateCollegeStatusDto,
    bitflowOwnerId: string,
  ): Promise<CollegeResponseDto> {
    const college = await this.prisma.colleges.findUnique({
      where: { id },
    });

    if (!college) {
      throw new NotFoundException(`College with ID '${id}' not found`);
    }

    const updated = await this.prisma.colleges.update({
      where: { id },
      data: { status: dto.status },
    });

    // Log the action
    const action = dto.status === CollegeStatus.SUSPENDED 
      ? AuditAction.COLLEGE_SUSPENDED 
      : AuditAction.COLLEGE_ACTIVATED;

    await this.auditService.log({
      userId: bitflowOwnerId,
      action,
      entityType: 'College',
      entityId: id,
      description: `College '${college.name}' status changed to ${dto.status}`,
      collegeId: id,
    });

    // If suspended, invalidate all associated user sessions
    if (dto.status === CollegeStatus.SUSPENDED) {
      await this.invalidateCollegeSessions(id);
    }

    return this.mapCollegeToDto(updated);
  }

  private async invalidateCollegeSessions(collegeId: string): Promise<void> {
    // Get all users from this college
    const users = await this.prisma.users.findMany({
      where: { collegeId },
      select: { id: true },
    });

    const userIds = users.map(u => u.id);

    // Revoke all refresh tokens
    await this.prisma.refresh_tokens.updateMany({
      where: { userId: { in: userIds } },
      data: { isRevoked: true },
    });

    // Deactivate all sessions
    await this.prisma.user_sessions.updateMany({
      where: { userId: { in: userIds } },
      data: { isActive: false },
    });
  }

  // ========================================================================
  // SECURITY POLICY & FEATURE FLAGS
  // ========================================================================

  async getSecurityPolicy(): Promise<SecurityPolicyResponseDto> {
    const policy = await this.prisma.security_policies.findFirst();
    
    if (!policy) {
      throw new NotFoundException('Security policy not found');
    }

    return policy;
  }

  async updateSecurityPolicy(
    dto: UpdateSecurityPolicyDto,
    bitflowOwnerId: string,
  ): Promise<SecurityPolicyResponseDto> {
    const policy = await this.prisma.security_policies.findFirst();

    if (!policy) {
      throw new NotFoundException('Security policy not found');
    }

    const updated = await this.prisma.security_policies.update({
      where: { id: policy.id },
      data: dto,
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.SECURITY_POLICY_UPDATED,
      entityType: 'SecurityPolicy',
      entityId: policy.id,
      description: 'Security policy updated',
      metadata: dto,
    });

    return updated;
  }

  async updateFeatureFlags(
    dto: UpdateFeatureFlagsDto,
    bitflowOwnerId: string,
  ): Promise<SecurityPolicyResponseDto> {
    const policy = await this.prisma.security_policies.findFirst();

    if (!policy) {
      throw new NotFoundException('Security policy not found');
    }

    const updated = await this.prisma.security_policies.update({
      where: { id: policy.id },
      data: dto,
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.SECURITY_POLICY_UPDATED,
      entityType: 'SecurityPolicy',
      entityId: policy.id,
      description: 'Feature flags updated',
      metadata: dto,
    });

    return updated;
  }

  // ========================================================================
  // PLATFORM-WIDE ANALYTICS (NON-PII)
  // ========================================================================

  async getPlatformAnalytics(dto: GetAnalyticsDto): Promise<PlatformAnalyticsResponseDto> {
    const { startDate, endDate } = this.getDateRange(dto);

    // Get aggregated counts
    const [
      activeColleges,
      suspendedColleges,
      activePublishers,
      suspendedPublishers,
      expiredPublishers,
      totalUsers,
      activeUsers,
      totalLogins,
      failedLoginAttempts,
      usersByRole,
    ] = await Promise.all([
      this.prisma.colleges.count({ where: { status: CollegeStatus.ACTIVE } }),
      this.prisma.colleges.count({ where: { status: CollegeStatus.SUSPENDED } }),
      this.prisma.publishers.count({ where: { status: PublisherStatus.ACTIVE } }),
      this.prisma.publishers.count({ where: { status: PublisherStatus.SUSPENDED } }),
      this.prisma.publishers.count({ 
        where: { 
          status: PublisherStatus.ACTIVE,
          contractEndDate: { lt: new Date() }
        } 
      }),
      this.prisma.users.count(),
      this.prisma.users.count({
        where: {
          lastLoginAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.audit_logs.count({
        where: {
          action: AuditAction.LOGIN_SUCCESS,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.audit_logs.count({
        where: {
          action: AuditAction.LOGIN_FAILED,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.users.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    // Get daily active users (users with LOGIN_SUCCESS in the period)
    const dailyLogins = await this.prisma.audit_logs.groupBy({
      by: ['timestamp'],
      where: {
        action: AuditAction.LOGIN_SUCCESS,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        userId: true,
      },
    });

    // Aggregate by day
    const dailyActiveUsers = this.aggregateByDay(dailyLogins, startDate, endDate);

    return {
      activeColleges,
      suspendedColleges,
      activePublishers,
      suspendedPublishers,
      expiredPublishers,
      totalUsers,
      activeUsers,
      totalLogins,
      failedLoginAttempts,
      dailyActiveUsers,
      usersByRole: usersByRole.map(r => ({
        role: r.role,
        count: r._count,
      })),
    };
  }

  private getDateRange(dto: GetAnalyticsDto): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

    if (dto.period === AnalyticsPeriod.CUSTOM) {
      if (!dto.startDate || !dto.endDate) {
        throw new BadRequestException('Start and end dates are required for CUSTOM period');
      }
      startDate = new Date(dto.startDate);
      endDate.setTime(new Date(dto.endDate).getTime());
    } else if (dto.period === AnalyticsPeriod.LAST_7_DAYS) {
      startDate.setDate(endDate.getDate() - 7);
    } else if (dto.period === AnalyticsPeriod.LAST_30_DAYS) {
      startDate.setDate(endDate.getDate() - 30);
    } else if (dto.period === AnalyticsPeriod.LAST_90_DAYS) {
      startDate.setDate(endDate.getDate() - 90);
    }

    return { startDate, endDate };
  }

  private aggregateByDay(
    logs: Array<{ timestamp: Date; _count: { userId: number } }>,
    startDate: Date,
    endDate: Date,
  ): Array<{ date: string; count: number }> {
    const dayMap = new Map<string, number>();

    // Initialize all days in range with 0
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dayMap.set(dateStr, 0);
      current.setDate(current.getDate() + 1);
    }

    // Fill in actual counts
    logs.forEach(log => {
      const dateStr = log.timestamp.toISOString().split('T')[0];
      dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + log._count.userId);
    });

    return Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ========================================================================
  // AUDIT LOG VIEWER
  // ========================================================================

  async getAuditLogs(dto: GetAuditLogsDto): Promise<AuditLogsResponseDto> {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    const where: any = {};

    if (dto.collegeId) where.collegeId = dto.collegeId;
    if (dto.publisherId) where.publisherId = dto.publisherId;
    if (dto.action) where.action = dto.action;

    if (dto.startDate || dto.endDate) {
      where.timestamp = {};
      if (dto.startDate) where.timestamp.gte = new Date(dto.startDate);
      if (dto.endDate) where.timestamp.lte = new Date(dto.endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where,
        include: {
          users: { select: { email: true } },
          colleges: { select: { name: true } },
          publishers: { select: { name: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.users?.email,
        collegeId: log.collegeId,
        collegeName: log.colleges?.name,
        publisherId: log.publisherId,
        publisherName: log.publishers?.name,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mapPublisherToDto(publisher: any): PublisherResponseDto {
    return {
      id: publisher.id,
      name: publisher.name,
      code: publisher.code,
      status: publisher.status,
      legalName: publisher.legalName,
      contactPerson: publisher.contactPerson,
      contactEmail: publisher.contactEmail,
      contractStartDate: publisher.contractStartDate,
      contractEndDate: publisher.contractEndDate,
      contractDocument: publisher.contractDocument,
      createdAt: publisher.createdAt,
      updatedAt: publisher.updatedAt,
      isContractExpired: publisher.contractEndDate ? new Date(publisher.contractEndDate) < new Date() : false,
    };
  }

  private mapCollegeToDto(college: any): CollegeResponseDto {
    return {
      id: college.id,
      name: college.name,
      code: college.code,
      status: college.status,
      emailDomain: college.emailDomain,
      adminContactEmail: college.adminContactEmail,
      address: college.address,
      city: college.city,
      state: college.state,
      createdAt: college.createdAt,
      updatedAt: college.updatedAt,
    };
  }

  // ========================================================================
  // PHASE 2: DASHBOARD OVERVIEW
  // ========================================================================

  async getDashboardOverview(): Promise<DashboardOverviewDto> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      // College metrics
      totalColleges,
      activeColleges,
      
      // Publisher metrics
      totalPublishers,
      activePublishers,
      expiredContractPublishers,
      
      // User metrics
      totalUsers,
      facultyCount,
      studentCount,
      
      // Content metrics
      contentByType,
      mcqCount,
      
      // Activity metrics
      dailyActiveUsers,
      monthlyActiveUsers,
      
      // Peak usage
      loginsByHour,
    ] = await Promise.all([
      // College counts
      this.prisma.colleges.count(),
      this.prisma.colleges.count({ where: { status: CollegeStatus.ACTIVE } }),
      
      // Publisher counts
      this.prisma.publishers.count(),
      this.prisma.publishers.count({ where: { status: PublisherStatus.ACTIVE } }),
      this.prisma.publishers.count({
        where: {
          contractEndDate: { lt: now },
          status: PublisherStatus.ACTIVE,
        },
      }),
      
      // User counts
      this.prisma.users.count(),
      this.prisma.users.count({ where: { role: UserRole.FACULTY } }),
      this.prisma.students.count(),
      
      // Content by type
      this.prisma.learning_units.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.mcqs.count(),
      
      // Daily active users (last 24 hours)
      this.prisma.users.count({
        where: {
          lastLoginAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Monthly active users
      this.prisma.users.count({
        where: {
          lastLoginAt: { gte: last30Days },
        },
      }),
      
      // Peak usage by hour (using audit logs)
      this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count
        FROM audit_logs
        WHERE action = 'LOGIN_SUCCESS'
          AND timestamp >= ${last7Days}
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY count DESC
      `,
    ]);

    // Transform content by type
    const contentTypeCounts = {
      books: contentByType.find(c => c.type === 'BOOK')?._count || 0,
      videos: contentByType.find(c => c.type === 'VIDEO')?._count || 0,
      notes: contentByType.find(c => c.type === 'NOTES')?._count || 0,
      mcqs: mcqCount,
    };

    // Transform peak usage hours
    const peakUsageHours = loginsByHour.map(h => ({
      hour: Number(h.hour),
      loginCount: Number(h.count),
    }));

    return {
      totalColleges,
      activeColleges,
      inactiveColleges: totalColleges - activeColleges,
      totalPublishers,
      activePublishers,
      expiredContractPublishers,
      totalUsers,
      facultyCount,
      studentCount,
      contentByType: contentTypeCounts,
      dailyActiveUsers,
      monthlyActiveUsers,
      peakUsageHours,
    };
  }

  // ========================================================================
  // PHASE 2: ACTIVITY TRENDS
  // ========================================================================

  async getActivityTrends(dto: GetAnalyticsDto): Promise<ActivityTrendsDto> {
    const { startDate, endDate } = this.getDateRange(dto);

    // Login trends by day
    const loginTrends = await this.prisma.$queryRaw<Array<{
      date: Date;
      successful: bigint;
      failed: bigint;
    }>>`
      SELECT 
        DATE(timestamp) as date,
        SUM(CASE WHEN action = 'LOGIN_SUCCESS' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN action = 'LOGIN_FAILED' THEN 1 ELSE 0 END) as failed
      FROM audit_logs
      WHERE timestamp >= ${startDate}
        AND timestamp <= ${endDate}
        AND action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    // Content access trends
    const contentAccessTrends = await this.prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
    }>>`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= ${startDate}
        AND timestamp <= ${endDate}
        AND action = 'CONTENT_ACCESSED'
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    return {
      loginTrends: loginTrends.map(t => ({
        date: t.date.toISOString().split('T')[0],
        successfulLogins: Number(t.successful),
        failedLogins: Number(t.failed),
      })),
      contentAccessTrends: contentAccessTrends.map(t => ({
        date: t.date.toISOString().split('T')[0],
        accessCount: Number(t.count),
      })),
      testParticipationTrends: [], // Will be implemented when test tracking is added
    };
  }

  // ========================================================================
  // PHASE 2: COLLEGE DETAILS
  // ========================================================================

  async getCollegeDetails(id: string): Promise<CollegeDetailResponseDto> {
    const college = await this.prisma.colleges.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            hod: { select: { fullName: true } },
            _count: {
              select: {
                faculty_assignments: true,
                student_departments: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            students: true,
            courses: true,
          },
        },
      },
    });

    if (!college) {
      throw new NotFoundException(`College with ID '${id}' not found`);
    }

    // Get faculty count
    const facultyCount = await this.prisma.users.count({
      where: {
        collegeId: id,
        role: UserRole.FACULTY,
      },
    });

    // Get usage stats
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [activeUsersLast7Days, activeUsersLast30Days, totalLogins] = await Promise.all([
      this.prisma.users.count({
        where: {
          collegeId: id,
          lastLoginAt: { gte: last7Days },
        },
      }),
      this.prisma.users.count({
        where: {
          collegeId: id,
          lastLoginAt: { gte: last30Days },
        },
      }),
      this.prisma.audit_logs.count({
        where: {
          collegeId: id,
          action: AuditAction.LOGIN_SUCCESS,
        },
      }),
    ]);

    // Calculate course completion rate
    const [totalProgress, completedProgress] = await Promise.all([
      this.prisma.student_progress.count({
        where: {
          courses: { collegeId: id },
        },
      }),
      this.prisma.student_progress.count({
        where: {
          courses: { collegeId: id },
          status: 'COMPLETED',
        },
      }),
    ]);

    const courseCompletionRate = totalProgress > 0 
      ? Math.round((completedProgress / totalProgress) * 100) 
      : 0;

    return {
      ...this.mapCollegeToDto(college),
      userCount: college._count.users,
      departmentCount: college.departments.length,
      facultyCount,
      studentCount: college._count.students,
      courseCount: college._count.courses,
      departments: college.departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        hodName: dept.hod?.fullName || null,
        facultyCount: dept._count.faculty_assignments,
        studentCount: dept._count.student_departments,
      })),
      usageStats: {
        activeUsersLast7Days,
        activeUsersLast30Days,
        totalLogins,
        courseCompletionRate,
      },
    };
  }

  // ========================================================================
  // PHASE 2: CHECK AND AUTO-EXPIRE PUBLISHER CONTRACTS
  // ========================================================================

  async checkExpiredContracts(): Promise<{ expiredCount: number; expiredPublishers: string[] }> {
    const now = new Date();
    
    // Find publishers with expired contracts that are still active
    const expiredPublishers = await this.prisma.publishers.findMany({
      where: {
        contractEndDate: { lt: now },
        status: PublisherStatus.ACTIVE,
      },
    });

    // Auto-deactivate content from expired publishers
    for (const publisher of expiredPublishers) {
      await this.prisma.learning_units.updateMany({
        where: {
          publisherId: publisher.id,
          status: ContentStatus.ACTIVE,
        },
        data: {
          status: ContentStatus.INACTIVE,
          deactivatedAt: now,
          deactivationReason: 'Publisher contract expired',
        },
      });

      // Log the action
      await this.auditService.log({
        action: AuditAction.CONTENT_DEACTIVATED,
        entityType: 'Publisher',
        entityId: publisher.id,
        description: `Content auto-deactivated due to expired contract for publisher '${publisher.name}'`,
        publisherId: publisher.id,
        metadata: { reason: 'contract_expired', contractEndDate: publisher.contractEndDate },
      });
    }

    return {
      expiredCount: expiredPublishers.length,
      expiredPublishers: expiredPublishers.map(p => p.name),
    };
  }

  // ========================================================================
  // PHASE 2: SUBJECT POPULARITY TRENDS
  // ========================================================================

  async getSubjectPopularity(): Promise<SubjectPopularityDto> {
    // Get all distinct subjects from learning units with their content counts
    const subjectContentCounts = await this.prisma.learning_units.groupBy({
      by: ['subject'],
      where: {
        status: ContentStatus.ACTIVE,
      },
      _count: {
        id: true,
      },
    });

    // Get access counts per subject from access logs
    const accessLogs = await this.prisma.learning_unit_access_logs.findMany({
      include: {
        learning_units: {
          select: { subject: true },
        },
      },
    });

    // Aggregate access counts by subject
    const accessBySubject = accessLogs.reduce((acc, log) => {
      const subject = log.learning_units?.subject;
      if (subject) {
        acc[subject] = (acc[subject] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get competency counts by subject
    const competencyBySubject = await this.prisma.competencies.groupBy({
      by: ['subject'],
      where: {
        status: 'ACTIVE',
      },
      _count: {
        id: true,
      },
    });

    const competencyMap = competencyBySubject.reduce((acc, item) => {
      acc[item.subject] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Combine all data
    const subjects = subjectContentCounts.map(item => ({
      subject: item.subject,
      contentCount: item._count.id,
      accessCount: accessBySubject[item.subject] || 0,
      competencyCount: competencyMap[item.subject] || 0,
    }));

    // Sort by access count descending (most popular first)
    subjects.sort((a, b) => b.accessCount - a.accessCount);

    return { subjects };
  }

  // ========================================================================
  // PHASE 2: COURSE COMPLETION RATES
  // ========================================================================

  async getCourseCompletionStats(): Promise<CourseCompletionStatsDto> {
    // Get all student progress records
    const allProgress = await this.prisma.student_progress.findMany({
      include: {
        courses: {
          include: {
            colleges: true,
          },
        },
      },
    });

    // Calculate overall completion rate
    const totalEnrollments = allProgress.length;
    const completedEnrollments = allProgress.filter(p => p.status === 'COMPLETED').length;
    const overallCompletionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100) 
      : 0;

    // Group by college
    const collegeStats = new Map<string, {
      collegeId: string;
      collegeName: string;
      total: number;
      completed: number;
    }>();

    for (const progress of allProgress) {
      const college = progress.courses?.colleges;
      if (!college) continue;

      if (!collegeStats.has(college.id)) {
        collegeStats.set(college.id, {
          collegeId: college.id,
          collegeName: college.name,
          total: 0,
          completed: 0,
        });
      }

      const stats = collegeStats.get(college.id)!;
      stats.total++;
      if (progress.status === 'COMPLETED') {
        stats.completed++;
      }
    }

    const completionByCollege = Array.from(collegeStats.values()).map(stats => ({
      collegeId: stats.collegeId,
      collegeName: stats.collegeName,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      totalCourses: stats.total,
      completedCourses: stats.completed,
    }));

    // Sort by completion rate descending
    completionByCollege.sort((a, b) => b.completionRate - a.completionRate);

    return {
      overallCompletionRate,
      completionByCollege,
    };
  }

  // ========================================================================
  // PHASE 2: ASSESSMENT PARTICIPATION RATIOS
  // ========================================================================

  async getAssessmentParticipation(): Promise<{
    totalAssessments: number;
    totalAttempts: number;
    participationRate: number;
    assessmentsByType: Array<{
      type: string;
      count: number;
      attempts: number;
      participationRate: number;
    }>;
    participationByCollege: Array<{
      collegeId: string;
      collegeName: string;
      totalAssignments: number;
      attempted: number;
      participationRate: number;
    }>;
  }> {
    // Get all MCQ learning units (assessments)
    const mcqUnits = await this.prisma.learning_units.findMany({
      where: {
        type: 'MCQ',
        status: ContentStatus.ACTIVE,
      },
    });

    const totalAssessments = mcqUnits.length;

    // Get step progress for MCQ type steps
    const mcqStepProgress = await this.prisma.step_progress.findMany({
      where: {
        learning_flow_steps: {
          stepType: 'MCQ',
        },
      },
      include: {
        students: {
          include: {
            colleges: true,
          },
        },
      },
    });

    const totalAttempts = mcqStepProgress.filter(p => p.attempts > 0).length;
    const totalEnrolled = mcqStepProgress.length;
    const participationRate = totalEnrolled > 0 
      ? Math.round((totalAttempts / totalEnrolled) * 100) 
      : 0;

    // Get assessments by learning unit type (all types that can be assessments)
    const stepsByType = await this.prisma.learning_flow_steps.groupBy({
      by: ['stepType'],
      _count: {
        id: true,
      },
    });

    const attemptsByType = await this.prisma.step_progress.groupBy({
      by: ['stepId'],
      where: {
        attempts: { gt: 0 },
      },
      _count: {
        id: true,
      },
    });

    // Get step types for attempted steps
    const attemptedStepIds = attemptsByType.map(a => a.stepId);
    const stepsWithTypes = await this.prisma.learning_flow_steps.findMany({
      where: {
        id: { in: attemptedStepIds },
      },
      select: {
        id: true,
        stepType: true,
      },
    });

    const typeAttemptsMap = stepsWithTypes.reduce((acc, step) => {
      acc[step.stepType] = (acc[step.stepType] || 0) + 
        (attemptsByType.find(a => a.stepId === step.id)?._count.id || 0);
      return acc;
    }, {} as Record<string, number>);

    const assessmentsByType = stepsByType.map(item => {
      const attempts = typeAttemptsMap[item.stepType] || 0;
      return {
        type: item.stepType,
        count: item._count.id,
        attempts,
        participationRate: item._count.id > 0 ? Math.round((attempts / item._count.id) * 100) : 0,
      };
    });

    // Participation by college
    const collegeParticipation = new Map<string, {
      collegeId: string;
      collegeName: string;
      totalAssignments: number;
      attempted: number;
    }>();

    for (const progress of mcqStepProgress) {
      const college = progress.students?.colleges;
      if (!college) continue;

      if (!collegeParticipation.has(college.id)) {
        collegeParticipation.set(college.id, {
          collegeId: college.id,
          collegeName: college.name,
          totalAssignments: 0,
          attempted: 0,
        });
      }

      const stats = collegeParticipation.get(college.id)!;
      stats.totalAssignments++;
      if (progress.attempts > 0) {
        stats.attempted++;
      }
    }

    const participationByCollege = Array.from(collegeParticipation.values()).map(stats => ({
      ...stats,
      participationRate: stats.totalAssignments > 0 
        ? Math.round((stats.attempted / stats.totalAssignments) * 100) 
        : 0,
    }));

    // Sort by participation rate descending
    participationByCollege.sort((a, b) => b.participationRate - a.participationRate);

    return {
      totalAssessments,
      totalAttempts,
      participationRate,
      assessmentsByType,
      participationByCollege,
    };
  }
}
