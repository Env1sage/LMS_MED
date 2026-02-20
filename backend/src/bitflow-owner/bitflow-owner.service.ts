import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
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
    private emailService: EmailService,
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

    // Auto-create Publisher Admin account
    const defaultPassword = 'Welcome@123'; // Users must change on first login
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const adminEmail = dto.contactEmail || `admin@${dto.code.toLowerCase()}.publisher.com`;
    const adminName = dto.contactPerson || `Admin - ${dto.name}`;

    const publisherAdmin = await this.prisma.users.create({
      data: {
        id: uuidv4(),
        email: adminEmail,
        passwordHash: hashedPassword,
        fullName: adminName,
        role: UserRole.PUBLISHER_ADMIN,
        status: 'ACTIVE',
        publisherId: publisher.id,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.PUBLISHER_CREATED,
      entityType: 'Publisher',
      entityId: publisher.id,
      description: `Publisher '${publisher.name}' (${publisher.code}) created with Admin (${adminEmail})`,
      publisherId: publisher.id,
      metadata: {
        adminId: publisherAdmin.id,
        adminEmail,
        defaultPasswordSet: true,
      },
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: publisherAdmin.id,
      description: `Publisher Admin account created for '${publisher.name}'`,
      publisherId: publisher.id,
    });

    // Send email credentials to Publisher Admin
    try {
      await this.emailService.sendCredentialEmail({
        to: adminEmail,
        fullName: adminName,
        email: adminEmail,
        tempPassword: defaultPassword,
        role: 'PUBLISHER_ADMIN',
        publisherName: dto.name,
      });
    } catch (error) {
      console.error('Failed to send Publisher Admin email:', error);
    }

    return {
      ...this.mapPublisherToDto(publisher),
      createdAccounts: {
        admin: { email: adminEmail, role: 'PUBLISHER_ADMIN' },
        defaultPassword: defaultPassword,
      },
    } as any;
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
      mcqs: publisher.learning_units.filter(lu => lu.type === 'MCQ').length + (publisher._count.mcqs || 0),
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
        taluka: dto.taluka,
        pincode: dto.pincode,
        logoUrl: dto.logoUrl,
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

    // Send email credentials to IT Admin
    try {
      await this.emailService.sendCredentialEmail({
        to: itAdminEmail,
        fullName: `IT Admin - ${dto.name}`,
        email: itAdminEmail,
        tempPassword: defaultPassword,
        role: 'COLLEGE_ADMIN',
        collegeName: dto.name,
      });
    } catch (error) {
      console.error('Failed to send IT Admin email:', error);
    }

    // Send email credentials to Dean
    try {
      await this.emailService.sendCredentialEmail({
        to: deanEmail,
        fullName: `Dean - ${dto.name}`,
        email: deanEmail,
        tempPassword: defaultPassword,
        role: 'COLLEGE_ADMIN',
        collegeName: dto.name,
      });
    } catch (error) {
      console.error('Failed to send Dean email:', error);
    }

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
    if (dto.entityType) where.entityType = dto.entityType;

    // Filter by user role via the related users table
    if (dto.userRole) {
      where.users = { role: dto.userRole };
    }

    // Full-text search across description, entityType, and related user email
    if (dto.search) {
      where.OR = [
        { description: { contains: dto.search, mode: 'insensitive' } },
        { entityType: { contains: dto.search, mode: 'insensitive' } },
        { users: { email: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    if (dto.startDate || dto.endDate) {
      where.timestamp = {};
      if (dto.startDate) where.timestamp.gte = new Date(dto.startDate);
      if (dto.endDate) where.timestamp.lte = new Date(dto.endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where,
        include: {
          users: { select: { email: true, role: true } },
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
        userRole: log.users?.role,
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
  // DELETE PUBLISHER & COLLEGE
  // ========================================================================

  async deletePublisher(publisherId: string, bitflowOwnerId: string): Promise<{ success: boolean; message: string }> {
    const publisher = await this.prisma.publishers.findUnique({
      where: { id: publisherId },
      include: { _count: { select: { packages: true, users: true } } },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher with ID '${publisherId}' not found`);
    }

    // Soft-delete: set status to INACTIVE and remove associated users
    await this.prisma.$transaction(async (tx) => {
      // Deactivate all associated users
      await tx.users.updateMany({
        where: { publisherId },
        data: { status: 'INACTIVE' },
      });

      // Deactivate all packages
      await tx.packages.updateMany({
        where: { publisherId },
        data: { status: 'INACTIVE' },
      });

      // Deactivate publisher
      await tx.publishers.update({
        where: { id: publisherId },
        data: { status: 'INACTIVE' },
      });
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.PUBLISHER_UPDATED,
      entityType: 'Publisher',
      entityId: publisherId,
      description: `Publisher '${publisher.name}' deleted (deactivated). ${publisher._count.packages} packages and ${publisher._count.users} users deactivated.`,
      publisherId,
    });

    return { success: true, message: `Publisher '${publisher.name}' and all associated data has been deactivated` };
  }

  async deleteCollege(collegeId: string, bitflowOwnerId: string): Promise<{ success: boolean; message: string }> {
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
      include: { _count: { select: { users: true, students: true } } },
    });

    if (!college) {
      throw new NotFoundException(`College with ID '${collegeId}' not found`);
    }

    // Soft-delete: deactivate everything
    await this.prisma.$transaction(async (tx) => {
      // Deactivate all users
      await tx.users.updateMany({
        where: { collegeId },
        data: { status: 'INACTIVE' },
      });

      // Cancel all package assignments
      await tx.college_packages.updateMany({
        where: { collegeId },
        data: { status: 'CANCELLED' },
      });

      // Deactivate college
      await tx.colleges.update({
        where: { id: collegeId },
        data: { status: 'INACTIVE' },
      });
    });

    await this.auditService.log({
      userId: bitflowOwnerId,
      action: AuditAction.COLLEGE_UPDATED,
      entityType: 'College',
      entityId: collegeId,
      description: `College '${college.name}' deleted (deactivated). ${college._count.users} users and ${college._count.students} students affected.`,
      collegeId,
    });

    return { success: true, message: `College '${college.name}' and all associated data has been deactivated` };
  }

  // ========================================================================
  // RESEND CREDENTIALS
  // ========================================================================

  async resendPublisherCredentials(publisherId: string, bitflowOwnerId: string): Promise<{ success: boolean; message: string }> {
    const publisher = await this.prisma.publishers.findUnique({
      where: { id: publisherId },
      include: {
        users: {
          where: { role: UserRole.PUBLISHER_ADMIN },
          take: 1,
        },
      },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher with ID '${publisherId}' not found`);
    }

    if (!publisher.users || publisher.users.length === 0) {
      throw new NotFoundException(`No admin account found for publisher '${publisher.name}'`);
    }

    const admin = publisher.users[0];
    const tempPassword = 'Welcome@123'; // Default password

    try {
      await this.emailService.sendCredentialEmail({
        to: admin.email,
        fullName: admin.fullName,
        email: admin.email,
        tempPassword: tempPassword,
        role: 'PUBLISHER_ADMIN',
        publisherName: publisher.name,
      });

      await this.auditService.log({
        userId: bitflowOwnerId,
        action: AuditAction.PUBLISHER_UPDATED,
        entityType: 'Publisher',
        entityId: publisherId,
        description: `Credentials resent to Publisher Admin (${admin.email})`,
        publisherId: publisherId,
      });

      return { success: true, message: `Credentials sent to ${admin.email}` };
    } catch (error) {
      throw new BadRequestException(`Failed to send email to ${admin.email}`);
    }
  }

  async resendCollegeCredentials(collegeId: string, role: 'IT_ADMIN' | 'DEAN', bitflowOwnerId: string): Promise<{ success: boolean; message: string }> {
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
      include: {
        users: {
          where: { role: role === 'IT_ADMIN' ? UserRole.COLLEGE_ADMIN : UserRole.COLLEGE_DEAN },
          take: 1,
        },
      },
    });

    if (!college) {
      throw new NotFoundException(`College with ID '${collegeId}' not found`);
    }

    if (!college.users || college.users.length === 0) {
      throw new NotFoundException(`No ${role} account found for college '${college.name}'`);
    }

    const user = college.users[0];
    const tempPassword = 'Welcome@123'; // Default password

    try {
      await this.emailService.sendCredentialEmail({
        to: user.email,
        fullName: user.fullName,
        email: user.email,
        tempPassword: tempPassword,
        role: 'COLLEGE_ADMIN',
        collegeName: college.name,
      });

      await this.auditService.log({
        userId: bitflowOwnerId,
        action: AuditAction.COLLEGE_UPDATED,
        entityType: 'College',
        entityId: collegeId,
        description: `Credentials resent to ${role} (${user.email})`,
        collegeId: collegeId,
      });

      return { success: true, message: `Credentials sent to ${user.email}` };
    } catch (error) {
      throw new BadRequestException(`Failed to send email to ${user.email}`);
    }
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
      mcqs: (contentByType.find(c => c.type === 'MCQ')?._count || 0) + mcqCount,
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
    // Get all MCQs (assessments) - MCQs are now a separate entity
    const mcqCount = await this.prisma.mcqs.count({
      where: {
        status: 'PUBLISHED',
      },
    });

    const totalAssessments = mcqCount;

    // Get MCQ usage stats from the mcqs table itself
    const mcqs = await this.prisma.mcqs.findMany({
      where: {
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        usageCount: true,
      },
    });

    const totalAttempts = mcqs.reduce((sum, m) => sum + m.usageCount, 0);
    const participationRate = totalAssessments > 0 
      ? Math.round((totalAttempts / totalAssessments) * 10) 
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

    // Participation by college - get from students table
    const collegeStats = await this.prisma.students.groupBy({
      by: ['collegeId'],
      _count: {
        id: true,
      },
    });

    const collegeIds = collegeStats.map(s => s.collegeId);
    const collegesData = await this.prisma.colleges.findMany({
      where: { id: { in: collegeIds } },
      select: { id: true, name: true },
    });

    const participationByCollege = collegeStats.map(stat => {
      const college = collegesData.find(c => c.id === stat.collegeId);
      return {
        collegeId: stat.collegeId,
        collegeName: college?.name || 'Unknown',
        totalAssignments: stat._count.id,
        attempted: Math.floor(stat._count.id * 0.7), // Placeholder
        participationRate: 70, // Placeholder until mcq_attempts table is added
      };
    });

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

  // ========================================================================
  // CONTENT MANAGEMENT - VIEW ALL PLATFORM CONTENT
  // ========================================================================

  /**
   * Get all learning units across all publishers with filtering
   */
  async getAllContent(query: {
    type?: string;
    publisherId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, publisherId, status, search, page = 1, limit = 20 } = query;

    const where: any = {};

    if (type) where.type = type;
    if (publisherId) where.publisherId = publisherId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.learning_units.findMany({
        where,
        include: {
          publishers: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learning_units.count({ where }),
    ]);

    return {
      data: items.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        subject: item.subject,
        topic: item.topic,
        subTopic: item.subTopic,
        difficultyLevel: item.difficultyLevel,
        estimatedDuration: item.estimatedDuration,
        status: item.status,
        competencyMappingStatus: item.competencyMappingStatus,
        thumbnailUrl: item.thumbnailUrl,
        tags: item.tags,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        publisher: item.publishers,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get content statistics by type
   */
  async getContentStats() {
    const [
      byType,
      byStatus,
      byPublisher,
      recentContent,
    ] = await Promise.all([
      this.prisma.learning_units.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.learning_units.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.learning_units.groupBy({
        by: ['publisherId'],
        _count: true,
      }),
      this.prisma.learning_units.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          publishers: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    // Get publisher names for byPublisher stats
    const publisherIds = byPublisher.map(p => p.publisherId).filter((id): id is string => id !== null);
    const publishers = await this.prisma.publishers.findMany({
      where: { id: { in: publisherIds } },
      select: { id: true, name: true },
    });
    const publisherMap = new Map(publishers.map(p => [p.id, p.name]));

    return {
      byType: byType.map(item => ({
        type: item.type,
        count: item._count,
      })),
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
      byPublisher: byPublisher.map(item => ({
        publisherId: item.publisherId,
        publisherName: item.publisherId ? (publisherMap.get(item.publisherId) || 'Unknown') : 'Faculty/Custom',
        count: item._count,
      })),
      recentContent: recentContent.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        subject: item.subject,
        status: item.status,
        createdAt: item.createdAt,
        publisherName: item.publishers?.name || 'Faculty/Custom',
      })),
    };
  }

  /**
   * Get single content item details
   */
  async getContentById(id: string) {
    const item = await this.prisma.learning_units.findUnique({
      where: { id },
      include: {
        publishers: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Content not found');
    }

    // Get competency details if mapped
    let competencies: any[] = [];
    if (item.competencyIds.length > 0) {
      competencies = await this.prisma.competencies.findMany({
        where: { id: { in: item.competencyIds } },
        select: {
          id: true,
          code: true,
          title: true,
          domain: true,
        },
      });
    }

    return {
      ...item,
      publisher: item.publishers,
      competencies,
    };
  }

  /**
   * Update content status (activate/deactivate)
   */
  async updateContentStatus(
    id: string, 
    status: string, 
    reason: string | undefined,
    userId: string,
  ) {
    const item = await this.prisma.learning_units.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Content not found');
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'ACTIVE') {
      updateData.activatedAt = new Date();
      updateData.activatedBy = userId;
    } else if (status === 'INACTIVE' || status === 'ARCHIVED') {
      updateData.deactivatedAt = new Date();
      updateData.deactivatedBy = userId;
      updateData.deactivationReason = reason;
    }

    const updated = await this.prisma.learning_units.update({
      where: { id },
      data: updateData,
      include: {
        publishers: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: status === 'ACTIVE' ? AuditAction.CONTENT_ACTIVATED : AuditAction.CONTENT_DEACTIVATED,
      entityType: 'LearningUnit',
      entityId: id,
      description: `Content status changed to ${status}: ${item.title}`,
      metadata: { previousStatus: item.status, newStatus: status, reason },
    });

    return updated;
  }

  /**
   * Get all MCQs across all publishers
   */
  async getAllMcqs(query: {
    publisherId?: string;
    status?: string;
    subject?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { publisherId, status, subject, search, page = 1, limit = 20 } = query;

    const where: any = {};

    if (publisherId) where.publisherId = publisherId;
    if (status) where.status = status;
    if (subject) where.subject = subject;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.mcqs.findMany({
        where,
        include: {
          publisher: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mcqs.count({ where }),
    ]);

    return {
      data: items.map(item => ({
        id: item.id,
        questionText: item.question,
        subject: item.subject,
        topic: item.topic,
        difficultyLevel: item.difficultyLevel,
        bloomsLevel: item.bloomsLevel,
        status: item.status,
        isVerified: item.isVerified,
        createdAt: item.createdAt,
        publisher: item.publisher,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get MCQ details
   */
  async getMcqById(id: string) {
    const mcq = await this.prisma.mcqs.findUnique({
      where: { id },
      include: {
        publisher: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!mcq) {
      throw new NotFoundException('MCQ not found');
    }

    // Get competency details if mapped
    let competencies: any[] = [];
    if (mcq.competencyIds.length > 0) {
      competencies = await this.prisma.competencies.findMany({
        where: { id: { in: mcq.competencyIds } },
        select: {
          id: true,
          code: true,
          title: true,
          domain: true,
        },
      });
    }

    return {
      ...mcq,
      questionText: mcq.question,
      options: [mcq.optionA, mcq.optionB, mcq.optionC, mcq.optionD, mcq.optionE].filter(Boolean),
      correctOptionIndex: ['A', 'B', 'C', 'D', 'E'].indexOf(mcq.correctAnswer),
      publisher: mcq.publisher,
      competencies,
    };
  }

  // ========================================================================
  // STUDENT PERFORMANCE ANALYTICS
  // ========================================================================

  /**
   * Get all teacher-created assignments across the platform
   */
  async getAllTeacherAssignments(query: {
    collegeId?: string;
    facultyId?: string;
    status?: string;
  }) {
    const { collegeId, facultyId, status } = query;

    const where: any = {
      type: 'ASSIGNMENT',
    };

    if (collegeId) where.collegeId = collegeId;
    if (facultyId) where.createdBy = facultyId;
    if (status) where.status = status;

    const assignments = await this.prisma.tests.findMany({
      where,
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        course: {
          select: { id: true, title: true, academicYear: true },
        },
        assignments: {
          select: { id: true, studentId: true },
        },
        attempts: {
          select: { 
            id: true, 
            studentId: true, 
            status: true, 
            totalScore: true,
            percentageScore: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch college data separately
    const collegeIds = [...new Set(assignments.map(a => a.collegeId))];
    const colleges = await this.prisma.colleges.findMany({
      where: { id: { in: collegeIds } },
      select: { id: true, name: true, code: true },
    });
    const collegeMap = new Map(colleges.map(c => [c.id, c]));

    return assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      totalMarks: a.totalMarks,
      passingMarks: a.passingMarks,
      dueDate: a.scheduledEndTime,
      startDate: a.scheduledStartTime,
      createdAt: a.createdAt,
      faculty: {
        id: a.creator?.id,
        name: a.creator?.fullName,
        email: a.creator?.email,
      },
      college: collegeMap.get(a.collegeId),
      course: a.course,
      totalStudents: a.assignments.length,
      submittedCount: a.attempts.filter((att: any) => 
        att.status === 'SUBMITTED' || att.status === 'GRADED'
      ).length,
      gradedCount: a.attempts.filter((att: any) => att.status === 'GRADED').length,
      avgScore: a.attempts.length > 0 
        ? a.attempts.reduce((sum: number, att: any) => sum + (att.percentageScore || 0), 0) / a.attempts.length 
        : null,
    }));
  }

  async getStudentPerformance(query: { collegeId?: string; courseId?: string; limit?: number }) {
    const { collegeId, courseId, limit = 50 } = query;

    const where: any = {};
    if (courseId) where.courseId = courseId;

    // Get student progress data
    const progress = await this.prisma.student_progress.findMany({
      where,
      include: {
        students: {
          select: {
            id: true, fullName: true, userId: true, collegeId: true,
            user: { select: { id: true, fullName: true, email: true } },
            college: { select: { id: true, name: true } },
          },
        },
        courses: {
          select: { id: true, title: true, collegeId: true },
        },
      },
      take: 500,
    });

    // Filter by college if specified
    const filteredProgress = collegeId
      ? progress.filter(p => p.students?.collegeId === collegeId || p.courses?.collegeId === collegeId)
      : progress;

    // Aggregate by student
    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      email: string;
      collegeName: string;
      totalCourses: number;
      completedCourses: number;
      inProgressCourses: number;
      completionRate: number;
      avgScore: number;
    }>();

    for (const p of filteredProgress) {
      if (!p.students) continue;
      const key = p.students.id;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId: p.students.id,
          studentName: p.students.fullName || p.students.user?.fullName || 'Unknown',
          email: p.students.user?.email || '',
          collegeName: p.students.college?.name || '',
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          completionRate: 0,
          avgScore: 0,
        });
      }
      const s = studentMap.get(key)!;
      s.totalCourses++;
      if (p.status === 'COMPLETED') s.completedCourses++;
      else s.inProgressCourses++;
    }

    // Calculate rates
    const students = Array.from(studentMap.values()).map(s => ({
      ...s,
      completionRate: s.totalCourses > 0 ? Math.round((s.completedCourses / s.totalCourses) * 100) : 0,
    }));

    // Get practice session stats
    const practiceStats = await this.prisma.practice_sessions.groupBy({
      by: ['studentId'],
      _avg: { correctAnswers: true, totalQuestions: true },
      _sum: { totalQuestions: true, correctAnswers: true, timeSpentSeconds: true },
      _count: true,
    });

    const practiceMap = new Map(practiceStats.map(p => [p.studentId, {
      totalPractice: p._count,
      totalQuestions: p._sum.totalQuestions || 0,
      totalCorrect: p._sum.correctAnswers || 0,
      accuracy: (p._sum.totalQuestions && p._sum.totalQuestions > 0) 
        ? Math.round(((p._sum.correctAnswers || 0) / p._sum.totalQuestions) * 100) : 0,
      totalTimeSpent: p._sum.timeSpentSeconds || 0,
    }]));

    const enrichedStudents = students.map(s => ({
      ...s,
      practiceStats: practiceMap.get(s.studentId) || {
        totalPractice: 0, totalQuestions: 0, totalCorrect: 0, accuracy: 0, totalTimeSpent: 0,
      },
    }));

    enrichedStudents.sort((a, b) => b.completionRate - a.completionRate);

    // Overall stats
    const totalStudents = enrichedStudents.length;
    const avgCompletionRate = totalStudents > 0 
      ? Math.round(enrichedStudents.reduce((s, st) => s + st.completionRate, 0) / totalStudents) : 0;
    const avgAccuracy = totalStudents > 0
      ? Math.round(enrichedStudents.reduce((s, st) => s + st.practiceStats.accuracy, 0) / totalStudents) : 0;

    return {
      summary: {
        totalStudents,
        avgCompletionRate,
        avgAccuracy,
        topPerformers: enrichedStudents.filter(s => s.completionRate >= 80).length,
        atRisk: enrichedStudents.filter(s => s.completionRate < 30 && s.totalCourses > 0).length,
      },
      students: enrichedStudents.slice(0, limit),
    };
  }

  // ========================================================================
  // TEACHER PERFORMANCE ANALYTICS
  // ========================================================================

  async getTeacherPerformance(query: { collegeId?: string; state?: string; city?: string; limit?: number }) {
    const { collegeId, state, city, limit = 50 } = query;

    const where: any = { role: UserRole.FACULTY };
    if (collegeId) where.collegeId = collegeId;
    if (state || city) {
      where.colleges = {};
      if (state) where.colleges.state = state;
      if (city) where.colleges.city = city;
    }

    const faculty = await this.prisma.users.findMany({
      where,
      include: {
        colleges: {
          select: { id: true, name: true, state: true, city: true },
        },
      },
      take: limit,
    });

    // Get courses created by each faculty
    const facultyIds = faculty.map(f => f.id);
    const courses = await this.prisma.courses.findMany({
      where: { facultyId: { in: facultyIds } },
      select: {
        id: true,
        title: true,
        facultyId: true,
        status: true,
        _count: {
          select: {
            course_assignments: true,
            student_progress: true,
            learning_flow_steps: true,
          },
        },
      },
    });

    // Get student progress for these courses
    const courseIds = courses.map(c => c.id);
    const studentProgress = await this.prisma.student_progress.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, status: true },
    });

    // Group courses by faculty
    const facultyCourseMap = new Map<string, typeof courses>();
    courses.forEach(c => {
      if (!facultyCourseMap.has(c.facultyId)) facultyCourseMap.set(c.facultyId, []);
      facultyCourseMap.get(c.facultyId)!.push(c);
    });

    // Group progress by course
    const courseProgressMap = new Map<string, { total: number; completed: number }>();
    studentProgress.forEach(p => {
      if (!courseProgressMap.has(p.courseId)) courseProgressMap.set(p.courseId, { total: 0, completed: 0 });
      const cp = courseProgressMap.get(p.courseId)!;
      cp.total++;
      if (p.status === 'COMPLETED') cp.completed++;
    });

    // Get college names
    const collegeIds = [...new Set(faculty.map(f => f.collegeId).filter(Boolean))] as string[];
    const colleges = await this.prisma.colleges.findMany({
      where: { id: { in: collegeIds } },
      select: { id: true, name: true },
    });
    const collegeNameMap = new Map(colleges.map(c => [c.id, c.name]));

    // Get ratings for faculty
    const ratings = await this.prisma.ratings.findMany({
      where: {
        ratingType: 'TEACHER',
        entityId: { in: facultyIds },
      },
      select: { entityId: true, rating: true },
    });

    const ratingMap = new Map<string, { total: number; count: number }>();
    ratings.forEach(r => {
      if (!ratingMap.has(r.entityId)) ratingMap.set(r.entityId, { total: 0, count: 0 });
      const rm = ratingMap.get(r.entityId)!;
      rm.total += r.rating;
      rm.count++;
    });

    const teachers = faculty.map(f => {
      const fCourses = facultyCourseMap.get(f.id) || [];
      let totalStudents = 0;
      let completedStudents = 0;

      fCourses.forEach(c => {
        const cp = courseProgressMap.get(c.id);
        if (cp) {
          totalStudents += cp.total;
          completedStudents += cp.completed;
        }
      });

      const ratingData = ratingMap.get(f.id);
      const avgRating = ratingData && ratingData.count > 0 
        ? Math.round((ratingData.total / ratingData.count) * 10) / 10 : 0;

      return {
        teacherId: f.id,
        teacherName: f.fullName,
        email: f.email,
        collegeName: (f as any).colleges?.name || (f.collegeId && collegeNameMap.get(f.collegeId)) || 'Unknown',
        city: (f as any).colleges?.city || null,
        state: (f as any).colleges?.state || null,
        totalCourses: fCourses.length,
        activeCourses: fCourses.filter(c => c.status === 'PUBLISHED').length,
        totalStudents,
        completedStudents,
        studentCompletionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
        avgRating,
        totalRatings: ratingData?.count || 0,
        lastActive: f.lastLoginAt,
        contentUploaded: fCourses.filter(c => c._count.learning_flow_steps > 0).length,
        materialsShared: fCourses.reduce((sum, c) => sum + (c._count.learning_flow_steps || 0), 0),
      };
    });

    teachers.sort((a, b) => b.studentCompletionRate - a.studentCompletionRate);

    const totalTeachers = teachers.length;
    const avgCompletionRate = totalTeachers > 0
      ? Math.round(teachers.reduce((s, t) => s + t.studentCompletionRate, 0) / totalTeachers) : 0;

    return {
      summary: {
        totalTeachers,
        avgCompletionRate,
        totalCourses: courses.length,
        avgCoursesPerTeacher: totalTeachers > 0 ? Math.round(courses.length / totalTeachers * 10) / 10 : 0,
        avgRating: totalTeachers > 0 
          ? Math.round(teachers.reduce((s, t) => s + t.avgRating, 0) / totalTeachers * 10) / 10 : 0,
      },
      teachers,
    };
  }

  // ========================================================================
  // COURSE PERFORMANCE ANALYTICS
  // ========================================================================

  async getCoursePerformance(query: { collegeId?: string; state?: string; city?: string; limit?: number }) {
    const { collegeId, state, city, limit = 50 } = query;

    const where: any = {};
    if (collegeId) where.collegeId = collegeId;
    if (state || city) {
      where.colleges = {};
      if (state) where.colleges.state = state;
      if (city) where.colleges.city = city;
    }

    const courses = await this.prisma.courses.findMany({
      where,
      include: {
        colleges: { select: { id: true, name: true, city: true, state: true } },
        users: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            course_assignments: true,
            student_progress: true,
            learning_flow_steps: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = courses.map(c => c.id);
    const progress = await this.prisma.student_progress.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, status: true },
    });

    const progressMap = new Map<string, { total: number; completed: number; inProgress: number }>();
    progress.forEach(p => {
      if (!progressMap.has(p.courseId)) progressMap.set(p.courseId, { total: 0, completed: 0, inProgress: 0 });
      const cp = progressMap.get(p.courseId)!;
      cp.total++;
      if (p.status === 'COMPLETED') cp.completed++;
      else cp.inProgress++;
    });

    // Get ratings for courses
    const courseRatings = await this.prisma.ratings.findMany({
      where: { ratingType: 'COURSE', entityId: { in: courseIds } },
      select: { entityId: true, rating: true },
    });

    const ratingMap = new Map<string, { total: number; count: number }>();
    courseRatings.forEach(r => {
      if (!ratingMap.has(r.entityId)) ratingMap.set(r.entityId, { total: 0, count: 0 });
      const rm = ratingMap.get(r.entityId)!;
      rm.total += r.rating;
      rm.count++;
    });

    const courseData = courses.map(c => {
      const cp = progressMap.get(c.id) || { total: 0, completed: 0, inProgress: 0 };
      const rd = ratingMap.get(c.id);
      return {
        courseId: c.id,
        courseTitle: c.title,
        courseCode: null,
        collegeName: c.colleges?.name || 'Unknown',
        city: c.colleges?.city || null,
        state: c.colleges?.state || null,
        facultyName: c.users?.fullName || 'Unknown',
        facultyEmail: c.users?.email || null,
        status: c.status,
        totalSteps: c._count.learning_flow_steps,
        totalUnits: c._count.course_assignments,
        enrolledStudents: cp.total,
        completedStudents: cp.completed,
        inProgressStudents: cp.inProgress,
        completionRate: cp.total > 0 ? Math.round((cp.completed / cp.total) * 100) : 0,
        avgRating: rd && rd.count > 0 ? Math.round((rd.total / rd.count) * 10) / 10 : 0,
        totalRatings: rd?.count || 0,
      };
    });

    courseData.sort((a, b) => b.completionRate - a.completionRate);

    return {
      summary: {
        totalCourses: courseData.length,
        avgCompletionRate: courseData.length > 0
          ? Math.round(courseData.reduce((s, c) => s + c.completionRate, 0) / courseData.length) : 0,
        totalEnrollments: courseData.reduce((s, c) => s + c.enrolledStudents, 0),
        totalCompletions: courseData.reduce((s, c) => s + c.completedStudents, 0),
      },
      courses: courseData,
    };
  }

  // ========================================================================
  // COLLEGE COMPARISON ANALYTICS
  // ========================================================================

  async getCollegeComparison(filters?: { state?: string; city?: string }) {
    const whereClause: any = { status: 'ACTIVE' };
    if (filters?.state) whereClause.state = filters.state;
    if (filters?.city) whereClause.city = filters.city;

    const colleges = await this.prisma.colleges.findMany({
      where: whereClause,
      select: { id: true, name: true, code: true, city: true, state: true },
    });

    const results = await Promise.all(colleges.map(async (college) => {
      const [
        studentCount,
        facultyCount,
        courseCount,
        progressData,
        practiceData,
        loginCount,
        packageCount,
      ] = await Promise.all([
        this.prisma.users.count({ where: { collegeId: college.id, role: UserRole.STUDENT } }),
        this.prisma.users.count({ where: { collegeId: college.id, role: UserRole.FACULTY } }),
        this.prisma.courses.count({ where: { collegeId: college.id } }),
        this.prisma.student_progress.findMany({
          where: { courses: { collegeId: college.id } },
          select: { status: true },
        }),
        this.prisma.practice_sessions.findMany({
          where: { student: { user: { collegeId: college.id } } },
          select: { correctAnswers: true, totalQuestions: true, timeSpentSeconds: true },
        }),
        this.prisma.audit_logs.count({
          where: { collegeId: college.id, action: AuditAction.LOGIN_SUCCESS },
        }),
        this.prisma.college_packages.count({
          where: { collegeId: college.id, status: 'ACTIVE' },
        }),
      ]);

      const totalEnrollments = progressData.length;
      const completedEnrollments = progressData.filter(p => p.status === 'COMPLETED').length;
      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

      const totalQuestions = practiceData.reduce((s, p) => s + p.totalQuestions, 0);
      const totalCorrect = practiceData.reduce((s, p) => s + p.correctAnswers, 0);
      const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const totalPracticeTime = practiceData.reduce((s, p) => s + p.timeSpentSeconds, 0);

      return {
        collegeId: college.id,
        collegeName: college.name,
        collegeCode: college.code,
        city: college.city || null,
        state: college.state || null,
        studentCount,
        facultyCount,
        courseCount,
        packageCount,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        avgAccuracy,
        totalPracticeTime,
        totalPracticeSessions: practiceData.length,
        loginCount,
        engagementScore: Math.round(
          (completionRate * 0.4) + (avgAccuracy * 0.3) + 
          (Math.min(loginCount / Math.max(studentCount, 1), 100) * 0.3)
        ),
      };
    }));

    results.sort((a, b) => b.engagementScore - a.engagementScore);

    return {
      colleges: results,
      summary: {
        totalColleges: results.length,
        avgCompletionRate: results.length > 0 
          ? Math.round(results.reduce((s, c) => s + c.completionRate, 0) / results.length) : 0,
        avgAccuracy: results.length > 0
          ? Math.round(results.reduce((s, c) => s + c.avgAccuracy, 0) / results.length) : 0,
        topCollege: results[0]?.collegeName || 'N/A',
        totalStudents: results.reduce((s, c) => s + c.studentCount, 0),
        totalFaculty: results.reduce((s, c) => s + c.facultyCount, 0),
      },
    };
  }

  // ========================================================================
  // EXPORT DATA
  // ========================================================================

  async getExportData(reportType: string, options: { collegeId?: string; format?: string }) {
    switch (reportType) {
      case 'student-performance':
        return this.getStudentPerformance({ collegeId: options.collegeId, limit: 10000 });
      case 'teacher-performance':
        return this.getTeacherPerformance({ collegeId: options.collegeId, limit: 10000 });
      case 'course-performance':
        return this.getCoursePerformance({ collegeId: options.collegeId, limit: 10000 });
      case 'college-comparison':
        return this.getCollegeComparison();
      case 'subject-popularity':
        return this.getSubjectPopularity();
      case 'course-completion':
        return this.getCourseCompletionStats();
      case 'assessment-participation':
        return this.getAssessmentParticipation();
      case 'weekly-activity':
        return this.getWeeklyActivitySummary({});
      case 'student-progress':
        return this.getDetailedStudentProgress({ page: 1, limit: 10000 });
      default:
        throw new NotFoundException(`Report type '${reportType}' not found`);
    }
  }

  // ========================================================================
  // LOCATION-BASED ANALYTICS
  // ========================================================================

  async getLocationBasedAnalytics(filters: { state?: string; city?: string; pincode?: string }) {
    const whereClause: any = {};
    if (filters.state) whereClause.state = filters.state;
    if (filters.city) whereClause.city = filters.city;
    if (filters.pincode) whereClause.pincode = filters.pincode;

    const colleges = await this.prisma.colleges.findMany({
      where: whereClause,
      include: {
        _count: { select: { students: true, users: true } },
      },
    });

    // Group by state
    const byState = new Map<string, any>();
    colleges.forEach(c => {
      if (!c.state) return;
      if (!byState.has(c.state)) {
        byState.set(c.state, {
          state: c.state,
          collegeCount: 0,
          studentCount: 0,
          facultyCount: 0,
          avgCompletionRate: 0,
        });
      }
      const entry = byState.get(c.state);
      entry.collegeCount++;
      entry.studentCount += c._count.students;
      entry.facultyCount += c._count.users;
    });

    // Group by city
    const byCity = new Map<string, any>();
    colleges.forEach(c => {
      if (!c.city || !c.state) return;
      const key = `${c.city}-${c.state}`;
      if (!byCity.has(key)) {
        byCity.set(key, {
          city: c.city,
          state: c.state,
          collegeCount: 0,
          studentCount: 0,
          facultyCount: 0,
          avgCompletionRate: 0,
        });
      }
      const entry = byCity.get(key);
      entry.collegeCount++;
      entry.studentCount += c._count.students;
      entry.facultyCount += c._count.users;
    });

    // Group by pincode
    const byPincode = new Map<string, any>();
    colleges.forEach(c => {
      if (!c.pincode || !c.city || !c.state) return;
      if (!byPincode.has(c.pincode)) {
        byPincode.set(c.pincode, {
          pincode: c.pincode,
          city: c.city,
          state: c.state,
          collegeCount: 0,
          studentCount: 0,
          avgCompletionRate: 0,
        });
      }
      const entry = byPincode.get(c.pincode);
      entry.collegeCount++;
      entry.studentCount += c._count.students;
    });

    return {
      byState: Array.from(byState.values()).sort((a, b) => b.studentCount - a.studentCount),
      byCity: Array.from(byCity.values()).sort((a, b) => b.studentCount - a.studentCount),
      byPincode: Array.from(byPincode.values()).sort((a, b) => b.studentCount - a.studentCount),
    };
  }

  // ========================================================================
  // DETAILED STUDENT PROGRESS
  // ========================================================================

  async getDetailedStudentProgress(filters: {
    page?: number;
    limit?: number;
    collegeId?: string;
    state?: string;
    city?: string;
    search?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (filters.collegeId) whereClause.collegeId = filters.collegeId;
    if (filters.state || filters.city) {
      whereClause.college = {};
      if (filters.state) whereClause.college.state = filters.state;
      if (filters.city) whereClause.college.city = filters.city;
    }
    if (filters.search) {
      whereClause.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.students.findMany({
        where: whereClause,
        take: limit,
        skip,
        include: {
          college: {
            select: { name: true, city: true, state: true },
          },
          student_progress: {
            include: {
              courses: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  users: { select: { fullName: true } },
                  learning_flow_steps: {
                    select: { id: true },
                  },
                },
              },
            },
          },
          user: {
            select: { email: true, lastLoginAt: true },
          },
          practice_sessions: {
            select: {
              totalQuestions: true,
              correctAnswers: true,
              timeSpentSeconds: true,
              completedAt: true,
            },
          },
          test_attempts: {
            select: {
              totalCorrect: true,
              totalIncorrect: true,
              totalSkipped: true,
              totalScore: true,
              percentageScore: true,
              submittedAt: true,
            },
          },
          step_progress: {
            select: {
              lastAccessedAt: true,
            },
            orderBy: {
              lastAccessedAt: 'desc',
            },
            take: 1,
          },
        },
      }),
      this.prisma.students.count({ where: whereClause }),
    ]);

    // Get student IDs for batch queries
    const studentIds = students.map(s => s.id);

    // Fetch login counts in batch
    const loginCounts = await this.prisma.audit_logs.groupBy({
      by: ['userId'],
      where: {
        userId: { in: students.map(s => s.userId) },
        action: AuditAction.LOGIN_SUCCESS,
      },
      _count: true,
    });
    const loginMap = new Map(loginCounts.map(l => [l.userId, l._count]));

    const studentProgress = students.map((student: any) => {
      const progress = student.student_progress || [];
      const completed = progress.filter((p: any) => p.status === 'COMPLETED').length;
      const inProgress = progress.filter((p: any) => p.status === 'IN_PROGRESS').length;
      const notStarted = progress.filter((p: any) => p.status === 'NOT_STARTED').length;

      // Calculate practice statistics
      const practiceSessions = student.practice_sessions || [];
      const totalPracticeSessions = practiceSessions.length;
      const totalQuestions = practiceSessions.reduce((sum: number, ps: any) => sum + ps.totalQuestions, 0);
      const correctAnswers = practiceSessions.reduce((sum: number, ps: any) => sum + ps.correctAnswers, 0);
      const totalTimeSpent = practiceSessions.reduce((sum: number, ps: any) => sum + ps.timeSpentSeconds, 0);
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const avgSessionDuration = totalPracticeSessions > 0 ? Math.round(totalTimeSpent / totalPracticeSessions) : 0;

      // Calculate test performance
      const testAttempts = student.test_attempts || [];
      const completedTests = testAttempts.filter((t: any) => t.submittedAt !== null);
      const testsAttempted = testAttempts.length;
      const testsCompleted = completedTests.length;
      const scores = completedTests
        .filter((t: any) => t.percentageScore !== null)
        .map((t: any) => t.percentageScore);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      // Calculate activity metrics
      const lastLoginAt = student.user?.lastLoginAt || null;
      const lastContentAccessAt = student.step_progress?.[0]?.lastAccessedAt || null;
      const daysActive = loginMap.get(student.userId) || 0;

      // Course details with accurate step counts
      const courseDetails = progress.map((p: any) => {
        const totalSteps = p.courses?.learning_flow_steps?.length || 0;
        const completedSteps = Array.isArray(p.completedSteps) ? p.completedSteps.length : 0;
        return {
          courseId: p.courses?.id || 'N/A',
          courseTitle: p.courses?.title || 'N/A',
          facultyName: p.courses?.users?.fullName || 'N/A',
          status: p.status,
          completedSteps,
          totalSteps,
          progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
          startedAt: p.startedAt,
          completedAt: p.completedAt,
        };
      });

      return {
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.user?.email || 'N/A',
        rollNumber: student.id.substring(0, 10),
        collegeName: student.college.name,
        city: student.college.city || 'N/A',
        state: student.college.state || 'N/A',
        currentYear: parseInt(student.currentAcademicYear?.replace('YEAR_', '') || '1'),
        currentSemester: 1,
        status: student.status,
        academicProgress: {
          totalCourses: progress.length,
          completedCourses: completed,
          inProgressCourses: inProgress,
          notStartedCourses: notStarted,
          completionRate: progress.length > 0 ? Math.round((completed / progress.length) * 100) : 0,
        },
        practiceStats: {
          totalPracticeSessions,
          totalQuestions,
          correctAnswers,
          accuracy,
          totalTimeSpent,
          avgSessionDuration,
        },
        testPerformance: {
          testsAttempted,
          testsCompleted,
          avgScore,
          highestScore,
          lowestScore,
        },
        recentActivity: {
          lastLoginAt,
          lastContentAccessAt,
          daysActive,
        },
        courseDetails,
      };
    });

    // Calculate summary statistics
    const totalStudents = studentProgress.length;
    const avgCompletionRate = totalStudents > 0
      ? Math.round(studentProgress.reduce((sum, s) => sum + s.academicProgress.completionRate, 0) / totalStudents)
      : 0;
    const avgAccuracy = totalStudents > 0
      ? Math.round(studentProgress.reduce((sum, s) => sum + s.practiceStats.accuracy, 0) / totalStudents)
      : 0;
    const topPerformers = studentProgress.filter(s => s.academicProgress.completionRate >= 80).length;
    const atRisk = studentProgress.filter(s => s.academicProgress.completionRate < 30 && s.academicProgress.totalCourses > 0).length;

    return {
      summary: {
        totalStudents,
        avgCompletionRate,
        avgAccuracy,
        topPerformers,
        atRisk,
      },
      students: studentProgress,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================================================
  // WEEKLY ACTIVITY SUMMARY
  // ========================================================================

  async getWeeklyActivitySummary(filters: { startDate?: string; endDate?: string }) {
    const now = new Date();
    const weekStart = filters.startDate ? new Date(filters.startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = filters.endDate ? new Date(filters.endDate) : now;

    // User activity
    const logins = await this.prisma.audit_logs.findMany({
      where: {
        action: 'LOGIN_SUCCESS',
        timestamp: { gte: weekStart, lte: weekEnd },
      },
      select: { userId: true },
    });

    const uniqueUsers = new Set(logins.map(l => l.userId).filter(Boolean)).size;

    const newUsers = await this.prisma.users.count({
      where: {
        createdAt: { gte: weekStart, lte: weekEnd },
      },
    });

    // Content activity
    const contentAccessed = await this.prisma.audit_logs.count({
      where: {
        action: { in: ['CONTENT_ACCESSED', 'LEARNING_UNIT_ACCESSED'] },
        timestamp: { gte: weekStart, lte: weekEnd },
      },
    });

    const testsAttempted = await this.prisma.test_attempts.count({
      where: {
        startedAt: { gte: weekStart, lte: weekEnd },
      },
    });

    const practiceSessionsCompleted = await this.prisma.practice_sessions.count({
      where: {
        completedAt: { gte: weekStart, lte: weekEnd },
      },
    });

    // Top active colleges
    const collegeActivity = await this.prisma.audit_logs.groupBy({
      by: ['collegeId'],
      where: {
        timestamp: { gte: weekStart, lte: weekEnd },
        collegeId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topActiveColleges = await Promise.all(
      collegeActivity.map(async (ca) => {
        const college = await this.prisma.colleges.findUnique({
          where: { id: ca.collegeId! },
          select: { name: true },
        });
        return {
          collegeName: college?.name || 'Unknown',
          activeUsers: 0,
          contentAccessed: ca._count.id,
        };
      })
    );

    // Security events
    const failedLogins = await this.prisma.audit_logs.count({
      where: {
        action: 'LOGIN_FAILED',
        timestamp: { gte: weekStart, lte: weekEnd },
      },
    });

    const securityViolations = await this.prisma.audit_logs.count({
      where: {
        action: { in: ['SECURITY_VIOLATION', 'UNAUTHORIZED_ACCESS'] },
        timestamp: { gte: weekStart, lte: weekEnd },
      },
    });

    const blockedAccess = await this.prisma.audit_logs.count({
      where: {
        action: { in: ['BLOCKED_ACCESS', 'BLOCKED_ACCESS_ATTEMPT'] },
        timestamp: { gte: weekStart, lte: weekEnd },
      },
    });

    return {
      weekStartDate: weekStart.toISOString().split('T')[0],
      weekEndDate: weekEnd.toISOString().split('T')[0],
      userActivity: {
        totalLogins: logins.length,
        uniqueUsers,
        newUsers,
        avgSessionDuration: 0,
      },
      contentActivity: {
        contentAccessed,
        coursesStarted: 0,
        coursesCompleted: 0,
        testsAttempted,
        practiceSessionsCompleted,
      },
      topActiveColleges,
      topActiveStudents: [],
      securityEvents: {
        failedLoginAttempts: failedLogins,
        suspiciousActivities: securityViolations,
        blockedAccessAttempts: blockedAccess,
      },
    };
  }
}

