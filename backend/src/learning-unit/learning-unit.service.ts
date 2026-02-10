import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { CreateLearningUnitDto } from './dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from './dto/update-learning-unit.dto';
import { QueryLearningUnitDto } from './dto/query-learning-unit.dto';
import { ContentStatus, CompetencyMappingStatus, UserRole, AuditAction, LearningUnitType, DeliveryType, DifficultyLevel } from '@prisma/client';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { FileUploadService } from '../publisher-admin/file-upload.service';

@Injectable()
export class LearningUnitService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private jwtService: JwtService,
    private fileUploadService: FileUploadService,
  ) {}

  /**
   * Create a new learning unit (PUBLISHER_ADMIN only)
   * Content starts in DRAFT status
   * Competency mapping is required before activation
   */
  async create(createDto: CreateLearningUnitDto, userId: string, publisherId: string) {
    // Validate competency IDs exist
    let hasCompetencies = false;
    if (createDto.competencyIds && createDto.competencyIds.length > 0) {
      const competencies = await this.prisma.competencies.findMany({
        where: { id: { in: createDto.competencyIds }, status: 'ACTIVE' },
      });
      if (competencies.length !== createDto.competencyIds.length) {
        throw new ForbiddenException('One or more competency IDs are invalid or not active');
      }
      hasCompetencies = true;
    }

    // Determine initial status based on competency mapping
    const initialStatus = hasCompetencies ? ContentStatus.ACTIVE : ContentStatus.PENDING_MAPPING;
    const mappingStatus = hasCompetencies ? CompetencyMappingStatus.COMPLETE : CompetencyMappingStatus.PENDING;

    const learningUnit = await this.prisma.learning_units.create({
      data: {
        id: uuidv4(),
        ...createDto,
        publisherId,
        status: initialStatus,
        competencyMappingStatus: mappingStatus,
        activatedAt: hasCompetencies ? new Date() : null,
        activatedBy: hasCompetencies ? userId : null,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_CREATED,
      entityType: 'LearningUnit',
      entityId: learningUnit.id,
      description: `Created learning unit: ${learningUnit.title} (status: ${initialStatus})`,
    });

    return learningUnit;
  }

  /**
   * Get all learning units for a publisher with filtering
   * Faculty can see all active learning units across publishers
   */
  async findAll(publisherId: string | undefined, query: QueryLearningUnitDto) {
    const { subject, topic, type, difficultyLevel, status, search, competencyId, page = 1, limit = 20 } = query;
    
    const where: any = publisherId ? { publisherId } : { status: ContentStatus.ACTIVE };

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
   * IMPORTANT: Cannot activate content without competency mapping
   */
  async updateStatus(id: string, status: ContentStatus, userId: string, publisherId: string) {
    const learningUnit = await this.findOne(id, publisherId);

    // Enforce competency mapping for activation
    if (status === ContentStatus.ACTIVE) {
      if (!learningUnit.competencyIds || learningUnit.competencyIds.length === 0) {
        throw new BadRequestException('Cannot activate content without competency mapping. Please map at least one competency first.');
      }
    }

    const updateData: any = { 
      status,
      updatedAt: new Date(),
    };

    // Set activation timestamp and user
    if (status === ContentStatus.ACTIVE) {
      updateData.activatedAt = new Date();
      updateData.activatedBy = userId;
      updateData.competencyMappingStatus = CompetencyMappingStatus.COMPLETE;
    } else if (status === ContentStatus.INACTIVE) {
      updateData.deactivatedAt = new Date();
      updateData.deactivatedBy = userId;
    }

    const updated = await this.prisma.learning_units.update({
      where: { id },
      data: updateData,
    });

    const action = status === ContentStatus.ACTIVE 
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
   * Activate content - requires competency mapping
   */
  async activateContent(id: string, userId: string, publisherId: string) {
    return this.updateStatus(id, ContentStatus.ACTIVE, userId, publisherId);
  }

  /**
   * Deactivate content
   */
  async deactivateContent(id: string, reason: string, userId: string, publisherId: string) {
    const learningUnit = await this.findOne(id, publisherId);

    const updated = await this.prisma.learning_units.update({
      where: { id },
      data: { 
        status: ContentStatus.INACTIVE,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        deactivationReason: reason,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_SUSPENDED,
      entityType: 'LearningUnit',
      entityId: id,
      description: `Deactivated: ${learningUnit.title}. Reason: ${reason}`,
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
      data: { 
        status: ContentStatus.INACTIVE,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        deactivationReason: 'Deleted by publisher',
        updatedAt: new Date(),
      },
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

    if (learningUnit.status !== ContentStatus.ACTIVE) {
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
        where: { publisherId, status: ContentStatus.ACTIVE } 
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

  /**
   * Bulk upload learning units from CSV
   */
  async bulkUploadFromCsv(
    file: Express.Multer.File,
    userId: string,
    publisherId: string,
  ): Promise<{ success: number; failed: number; errors: string[]; created: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    const results: any[] = [];
    const errors: string[] = [];
    const created: any[] = [];

    // Parse CSV
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(file.buffer);
      stream
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        // Validate required fields
        if (!row.type || !row.title || !row.description || !row.subject || !row.topic || !row.secureAccessUrl) {
          throw new Error('Missing required fields (type, title, description, subject, topic, secureAccessUrl)');
        }

        // Validate type
        const validTypes = ['BOOK', 'VIDEO', 'MCQ'];
        if (!validTypes.includes(row.type.toUpperCase())) {
          throw new Error(`Invalid type: ${row.type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate description length
        if (row.description.length < 20) {
          throw new Error('Description must be at least 20 characters');
        }

        // Validate difficulty level
        const validDifficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
        const difficultyLevel = row.difficultyLevel?.toUpperCase() || 'INTERMEDIATE';
        if (!validDifficulties.includes(difficultyLevel)) {
          throw new Error(`Invalid difficultyLevel: ${row.difficultyLevel}`);
        }

        // Validate delivery type
        const validDeliveryTypes = ['REDIRECT', 'EMBED', 'STREAM'];
        const deliveryType = row.deliveryType?.toUpperCase() || 'REDIRECT';
        if (!validDeliveryTypes.includes(deliveryType)) {
          throw new Error(`Invalid deliveryType: ${row.deliveryType}`);
        }

        // Parse competency codes/IDs and resolve to IDs
        let competencyIds: string[] = [];
        if (row.competencyIds || row.competencyCodes) {
          const inputCodes = (row.competencyCodes || row.competencyIds || '')
            .split(',')
            .map((code: string) => code.trim())
            .filter(Boolean);
          
          if (inputCodes.length > 0) {
            // Check if inputs look like UUIDs or codes
            const isUUID = inputCodes[0].includes('-') && inputCodes[0].length > 30;
            
            if (isUUID) {
              // Direct UUIDs provided
              competencyIds = inputCodes;
            } else {
              // Codes provided - resolve to IDs
              const competencies = await this.prisma.competencies.findMany({
                where: { 
                  code: { in: inputCodes },
                  status: 'ACTIVE',
                },
                select: { id: true, code: true },
              });
              
              if (competencies.length !== inputCodes.length) {
                const foundCodes = competencies.map((c: { id: string; code: string }) => c.code);
                const notFound = inputCodes.filter((code: string) => !foundCodes.includes(code));
                throw new Error(`Competency codes not found: ${notFound.join(', ')}`);
              }
              
              competencyIds = competencies.map((c: { id: string; code: string }) => c.id);
            }
          }
        }

        // Determine status based on competency mapping
        const hasCompetencies = competencyIds.length > 0;
        const initialStatus = hasCompetencies ? ContentStatus.ACTIVE : ContentStatus.PENDING_MAPPING;
        const mappingStatus = hasCompetencies ? CompetencyMappingStatus.COMPLETE : CompetencyMappingStatus.PENDING;

        // Create learning unit
        const learningUnit = await this.prisma.learning_units.create({
          data: {
            id: uuidv4(),
            publisherId,
            type: row.type.toUpperCase() as LearningUnitType,
            title: row.title.trim(),
            description: row.description.trim(),
            subject: row.subject.trim(),
            topic: row.topic.trim(),
            subTopic: row.subTopic?.trim() || null,
            difficultyLevel: difficultyLevel as DifficultyLevel,
            estimatedDuration: parseInt(row.estimatedDuration) || 30,
            competencyIds,
            secureAccessUrl: row.secureAccessUrl.trim(),
            deliveryType: deliveryType as DeliveryType,
            watermarkEnabled: row.watermarkEnabled?.toLowerCase() !== 'false',
            sessionExpiryMinutes: parseInt(row.sessionExpiryMinutes) || 30,
            status: initialStatus,
            competencyMappingStatus: mappingStatus,
            activatedAt: hasCompetencies ? new Date() : null,
            activatedBy: hasCompetencies ? userId : null,
            updatedAt: new Date(),
          },
        });

        created.push({
          id: learningUnit.id,
          title: learningUnit.title,
          type: learningUnit.type,
        });
        success++;
      } catch (err: any) {
        errors.push(`Row ${rowNum}: ${err.message}`);
        failed++;
      }
    }

    // Log bulk upload action
    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_CREATED,
      entityType: 'LearningUnit',
      entityId: 'bulk-upload',
      description: `Bulk uploaded ${success} learning units (${failed} failed)`,
      metadata: { success, failed, totalRows: results.length },
    });

    return { success, failed, errors, created };
  }

  /**
   * Bulk upload files with metadata
   */
  async bulkUploadWithFiles(
    files: Express.Multer.File[],
    metadataJson: string,
    userId: string,
    publisherId: string,
  ): Promise<{ success: number; failed: number; errors: string[]; created: any[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    let metadata: any[];
    try {
      metadata = JSON.parse(metadataJson);
    } catch {
      throw new BadRequestException('Invalid metadata JSON');
    }

    if (metadata.length !== files.length) {
      throw new BadRequestException(`Metadata count (${metadata.length}) must match files count (${files.length})`);
    }

    const errors: string[] = [];
    const created: any[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = metadata[i];

      try {
        // Validate required metadata
        if (!meta.type || !meta.title || !meta.description || !meta.subject || !meta.topic) {
          throw new Error('Missing required metadata (type, title, description, subject, topic)');
        }

        if (meta.description.length < 20) {
          throw new Error('Description must be at least 20 characters');
        }

        // Determine file type for upload
        let fileType: 'book' | 'video' | 'note' | 'image' = 'book';
        if (meta.type.toUpperCase() === 'VIDEO') fileType = 'video';
        else if (meta.type.toUpperCase() === 'MCQ') fileType = 'note';

        // Upload file
        const fileUrl = await this.fileUploadService.uploadFile(file, fileType);

        // Determine status based on competency mapping
        const hasCompetencies = meta.competencyIds && meta.competencyIds.length > 0;
        const initialStatus = hasCompetencies ? ContentStatus.ACTIVE : ContentStatus.PENDING_MAPPING;
        const mappingStatus = hasCompetencies ? CompetencyMappingStatus.COMPLETE : CompetencyMappingStatus.PENDING;

        // Create learning unit
        const learningUnit = await this.prisma.learning_units.create({
          data: {
            id: uuidv4(),
            publisherId,
            type: meta.type.toUpperCase() as LearningUnitType,
            title: meta.title.trim(),
            description: meta.description.trim(),
            subject: meta.subject.trim(),
            topic: meta.topic.trim(),
            subTopic: meta.subTopic?.trim() || null,
            difficultyLevel: (meta.difficultyLevel?.toUpperCase() || 'INTERMEDIATE') as DifficultyLevel,
            estimatedDuration: parseInt(meta.estimatedDuration) || 30,
            competencyIds: meta.competencyIds || [],
            secureAccessUrl: fileUrl,
            deliveryType: (meta.deliveryType?.toUpperCase() || 'REDIRECT') as DeliveryType,
            watermarkEnabled: meta.watermarkEnabled !== false,
            sessionExpiryMinutes: parseInt(meta.sessionExpiryMinutes) || 30,
            status: initialStatus,
            competencyMappingStatus: mappingStatus,
            activatedAt: hasCompetencies ? new Date() : null,
            activatedBy: hasCompetencies ? userId : null,
            updatedAt: new Date(),
          },
        });

        created.push({
          id: learningUnit.id,
          title: learningUnit.title,
          type: learningUnit.type,
          fileUrl,
        });
        success++;
      } catch (err: any) {
        errors.push(`File ${i + 1} (${file.originalname}): ${err.message}`);
        failed++;
      }
    }

    // Log bulk upload action
    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.LEARNING_UNIT_CREATED,
      entityType: 'LearningUnit',
      entityId: 'bulk-upload-files',
      description: `Bulk uploaded ${success} learning units with files (${failed} failed)`,
      metadata: { success, failed, totalFiles: files.length },
    });

    return { success, failed, errors, created };
  }
}
