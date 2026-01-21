import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { CreateLearningUnitDto } from './dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from './dto/update-learning-unit.dto';
import { QueryLearningUnitDto } from './dto/query-learning-unit.dto';
import { LearningUnitStatus, UserRole, AuditAction } from '@prisma/client';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LearningUnitService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private jwtService: JwtService,
  ) {}

  /**
   * Create a new learning unit (PUBLISHER_ADMIN only)
   */
  async create(createDto: CreateLearningUnitDto, userId: string, publisherId: string) {
    // Validate competency IDs exist
    if (createDto.competencyIds.length > 0) {
      const competencies = await this.prisma.competencies.findMany({
        where: { id: { in: createDto.competencyIds }, status: 'ACTIVE' },
      });
      if (competencies.length !== createDto.competencyIds.length) {
        throw new ForbiddenException('One or more competency IDs are invalid or not active');
      }
    }

    const learningUnit = await this.prisma.learning_units.create({
      data: {
        id: uuidv4(),
        ...createDto,
        publisherId,
        status: LearningUnitStatus.ACTIVE,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_CREATED,
      entityType: 'LearningUnit',
      entityId: learningUnit.id,
      description: `Created learning unit: ${learningUnit.title}`,
    });

    return learningUnit;
  }

  /**
   * Get all learning units for a publisher with filtering
   * Faculty can see all active learning units across publishers
   */
  async findAll(publisherId: string | undefined, query: QueryLearningUnitDto) {
    const { subject, topic, type, difficultyLevel, status, search, competencyId, page = 1, limit = 20 } = query;
    
    const where: any = publisherId ? { publisherId } : { status: LearningUnitStatus.ACTIVE };

    if (subject) where.subject = subject;
    if (topic) where.topic = topic;
    if (type) where.type = type;
    if (difficultyLevel) where.difficultyLevel = difficultyLevel;
    if (status && publisherId) where.status = status; // Only publishers can filter by status
    if (competencyId) {
      where.competencyIds = { has: competencyId };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [learningUnits, total] = await Promise.all([
      this.prisma.learning_units.findMany({
        where,
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learning_units.count({ where }),
    ]);

    return {
      data: learningUnits,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get learning unit by ID
   */
  async findOne(id: string, publisherId?: string) {
    const where: any = { id };
    if (publisherId) where.publisherId = publisherId;

    const learningUnit = await this.prisma.learning_units.findFirst({ where });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    return learningUnit;
  }

  /**
   * Update learning unit (Publisher admin only, own content)
   */
  async update(id: string, updateDto: UpdateLearningUnitDto, userId: string, publisherId: string) {
    const learningUnit = await this.findOne(id, publisherId);

    // Validate competency IDs if provided
    if (updateDto.competencyIds && updateDto.competencyIds.length > 0) {
      const competencies = await this.prisma.competencies.findMany({
        where: { id: { in: updateDto.competencyIds }, status: 'ACTIVE' },
      });
      if (competencies.length !== updateDto.competencyIds.length) {
        throw new ForbiddenException('One or more competency IDs are invalid or not active');
      }
    }

    const updated = await this.prisma.learning_units.update({
      where: { id },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_UPDATED,
      entityType: 'LearningUnit',
      entityId: id,
      description: `Updated learning unit: ${learningUnit.title}`,
    });

    return updated;
  }

  /**
   * Update learning unit status
   */
  async updateStatus(id: string, status: LearningUnitStatus, userId: string, publisherId: string) {
    const learningUnit = await this.findOne(id, publisherId);

    const updated = await this.prisma.learning_units.update({
      where: { id },
      data: { status },
    });

    const action = status === LearningUnitStatus.ACTIVE 
      ? AuditAction.LEARNING_UNIT_ACTIVATED 
      : AuditAction.LEARNING_UNIT_SUSPENDED;

    await this.auditService.log({
      userId,
      publisherId,
      action,
      entityType: 'LearningUnit',
      entityId: id,
      description: `Changed status to ${status}: ${learningUnit.title}`,
    });

    return updated;
  }

  /**
   * Delete learning unit (soft delete by setting status to INACTIVE)
   */
  async remove(id: string, userId: string, publisherId: string) {
    const learningUnit = await this.findOne(id, publisherId);

    const deleted = await this.prisma.learning_units.update({
      where: { id },
      data: { status: LearningUnitStatus.INACTIVE },
    });

    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_SUSPENDED,
      entityType: 'LearningUnit',
      entityId: id,
      description: `Deleted learning unit: ${learningUnit.title}`,
    });

    return deleted;
  }

  /**
   * Generate secure access token for content access
   * This is the critical security function - time-bound, session-specific
   */
  async generateAccessToken(
    learningUnitId: string,
    userId: string,
    collegeId: string | undefined,
    role: UserRole,
    deviceType: string,
    ipAddress: string,
    userAgent: string,
    userFullName: string,
    collegeName?: string,
  ) {
    // Verify learning unit exists and is active
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: learningUnitId },
    });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    if (learningUnit.status !== LearningUnitStatus.ACTIVE) {
      throw new ForbiddenException('Learning unit is not available');
    }

    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    
    // Generate access token (short-lived)
    const tokenPayload = {
      sessionId,
      learningUnitId,
      userId,
      collegeId,
      role,
      deviceType,
      type: 'content_access',
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: `${learningUnit.sessionExpiryMinutes}m`,
    });

    // Create watermark payload
    const watermarkPayload = {
      userId,
      name: userFullName,
      college: collegeName || 'N/A',
      timestamp: new Date().toISOString(),
      sessionId,
    };

    // Log access attempt
    await this.prisma.learning_unit_access_logs.create({
      data: {
        id: uuidv4(),
        learningUnitId,
        userId,
        collegeId,
        accessToken,
        ipAddress,
        userAgent,
        deviceType,
        watermarkPayload,
      },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.LEARNING_UNIT_ACCESSED,
      entityType: 'LearningUnit',
      entityId: learningUnitId,
      description: `Generated access token for: ${learningUnit.title}`,
      metadata: { deviceType, sessionId },
    });

    return {
      accessToken,
      sessionId,
      expiresIn: learningUnit.sessionExpiryMinutes * 60, // in seconds
      learningUnit: {
        id: learningUnit.id,
        title: learningUnit.title,
        type: learningUnit.type,
        deliveryType: learningUnit.deliveryType,
        secureAccessUrl: learningUnit.secureAccessUrl,
        estimatedDuration: learningUnit.estimatedDuration,
        watermarkEnabled: learningUnit.watermarkEnabled,
      },
      watermark: learningUnit.watermarkEnabled ? watermarkPayload : null,
    };
  }

  /**
   * Get publisher analytics (privacy-safe)
   */
  async getAnalytics(publisherId: string) {
    const [totalUnits, activeUnits, totalViews, uniqueViewers] = await Promise.all([
      this.prisma.learning_units.count({ where: { publisherId } }),
      this.prisma.learning_units.count({ 
        where: { publisherId, status: LearningUnitStatus.ACTIVE } 
      }),
      this.prisma.learning_unit_access_logs.count({
        where: { learning_units: { publisherId } },
      }),
      this.prisma.learning_unit_access_logs.findMany({
        where: { learning_units: { publisherId } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    // Get views by type
    const viewsByType = await this.prisma.learning_unit_access_logs.groupBy({
      by: ['learningUnitId'],
      where: { learning_units: { publisherId } },
      _count: true,
    });

    // Get college-wise usage (counts only, no student names)
    const collegeUsage = await this.prisma.learning_unit_access_logs.groupBy({
      by: ['collegeId'],
      where: { 
        learning_units: { publisherId },
        collegeId: { not: null },
      },
      _count: true,
    });

    return {
      totalLearningUnits: totalUnits,
      activeLearningUnits: activeUnits,
      totalViews,
      uniqueViewers: uniqueViewers.length,
      viewsByType: viewsByType.length,
      collegeUsageCount: collegeUsage.length,
    };
  }

  /**
   * Get learning unit statistics
   */
  async getStats(publisherId: string) {
    const [total, byType, byDifficulty, byStatus] = await Promise.all([
      this.prisma.learning_units.count({ where: { publisherId } }),
      this.prisma.learning_units.groupBy({
        by: ['type'],
        where: { publisherId },
        _count: true,
      }),
      this.prisma.learning_units.groupBy({
        by: ['difficultyLevel'],
        where: { publisherId },
        _count: true,
      }),
      this.prisma.learning_units.groupBy({
        by: ['status'],
        where: { publisherId },
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      byDifficulty: byDifficulty.map(d => ({ level: d.difficultyLevel, count: d._count })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
    };
  }
}
