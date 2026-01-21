import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { QueryCompetencyDto } from './dto/query-competency.dto';
import { DeprecateCompetencyDto } from './dto/deprecate-competency.dto';
import { CompetencyStatus, UserRole, AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompetencyService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new competency (BITFLOW_OWNER only)
   */
  async create(createDto: CreateCompetencyDto, userId: string) {
    // Check if code already exists
    const existing = await this.prisma.competencies.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(`Competency with code '${createDto.code}' already exists`);
    }

    const competency = await this.prisma.competencies.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        ...createDto,
        createdBy: userId,
        status: CompetencyStatus.DRAFT,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.COMPETENCY_CREATED,
      entityType: 'Competency',
      entityId: competency.id,
      description: `Created competency: ${competency.code} - ${competency.title}`,
    });

    return competency;
  }

  /**
   * Get all competencies with filtering and pagination
   */
  async findAll(query: QueryCompetencyDto) {
    const { 
      subject, 
      domain, 
      academicLevel, 
      status, 
      search, 
      sortBy = 'code', 
      sortOrder = 'asc',
      page = 1, 
      limit = 50 
    } = query;
    
    // Build base filters (these are AND conditions)
    const andConditions: any[] = [];

    if (subject) andConditions.push({ subject });
    if (domain) andConditions.push({ domain });
    if (academicLevel) andConditions.push({ academicLevel });
    if (status) andConditions.push({ status });
    
    // Add search condition (OR across multiple fields)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      andConditions.push({
        OR: [
          { code: { contains: searchTerm, mode: 'insensitive' } },
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { subject: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }
    
    // Combine all conditions with AND
    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    // Build orderBy based on sortBy and sortOrder
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [competencies, total] = await Promise.all([
      this.prisma.competencies.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.competencies.count({ where }),
    ]);

    return {
      data: competencies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get competency by ID
   */
  async findOne(id: string) {
    const competency = await this.prisma.competencies.findUnique({
      where: { id },
    });

    if (!competency) {
      throw new NotFoundException('Competency not found');
    }

    return competency;
  }

  /**
   * Update competency (restricted to adding reviewedBy only)
   */
  async update(id: string, updateDto: UpdateCompetencyDto, userId: string) {
    const competency = await this.findOne(id);

    if (competency.status !== CompetencyStatus.DRAFT) {
      throw new ForbiddenException('Only DRAFT competencies can be updated');
    }

    const updated = await this.prisma.competencies.update({
      where: { id },
      data: {
        reviewedBy: updateDto.reviewedBy,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.COMPETENCY_REVIEWED,
      entityType: 'Competency',
      entityId: id,
      description: `Reviewed competency: ${competency.code}`,
    });

    return updated;
  }

  /**
   * Activate a competency (makes it immutable)
   */
  async activate(id: string, userId: string) {
    const competency = await this.findOne(id);

    if (competency.status !== CompetencyStatus.DRAFT) {
      throw new ForbiddenException('Only DRAFT competencies can be activated');
    }

    if (!competency.reviewedBy) {
      throw new ForbiddenException('Competency must be reviewed before activation');
    }

    const activated = await this.prisma.competencies.update({
      where: { id },
      data: {
        status: CompetencyStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.COMPETENCY_ACTIVATED,
      entityType: 'Competency',
      entityId: id,
      description: `Activated competency: ${competency.code} - ${competency.title}`,
    });

    return activated;
  }

  /**
   * Deprecate a competency (immutable action)
   */
  async deprecate(id: string, deprecateDto: DeprecateCompetencyDto, userId: string) {
    const competency = await this.findOne(id);

    if (competency.status === CompetencyStatus.DEPRECATED) {
      throw new ForbiddenException('Competency is already deprecated');
    }

    // Verify replacement competency exists if provided
    if (deprecateDto.replacedBy) {
      const replacement = await this.prisma.competencies.findUnique({
        where: { id: deprecateDto.replacedBy },
      });
      if (!replacement) {
        throw new NotFoundException('Replacement competency not found');
      }
      if (replacement.status !== CompetencyStatus.ACTIVE) {
        throw new ForbiddenException('Replacement competency must be ACTIVE');
      }
    }

    const deprecated = await this.prisma.competencies.update({
      where: { id },
      data: {
        status: CompetencyStatus.DEPRECATED,
        deprecatedAt: new Date(),
        replacedBy: deprecateDto.replacedBy,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.COMPETENCY_DEPRECATED,
      entityType: 'Competency',
      entityId: id,
      description: `Deprecated competency: ${competency.code}${deprecateDto.replacedBy ? ` (replaced by: ${deprecateDto.replacedBy})` : ''}`,
      metadata: { replacedBy: deprecateDto.replacedBy || null },
    });

    return deprecated;
  }

  /**
   * Get available subjects (for filtering UI)
   */
  async getSubjects() {
    const results = await this.prisma.competencies.groupBy({
      by: ['subject'],
      _count: {
        subject: true,
      },
      where: {
        status: CompetencyStatus.ACTIVE,
      },
      orderBy: {
        subject: 'asc',
      },
    });

    return results.map(r => ({
      subject: r.subject,
      count: r._count.subject,
    }));
  }

  /**
   * Get competency statistics
   */
  async getStats() {
    const [totalCount, activeCount, draftCount, deprecatedCount, subjectCount] = await Promise.all([
      this.prisma.competencies.count(),
      this.prisma.competencies.count({ where: { status: CompetencyStatus.ACTIVE } }),
      this.prisma.competencies.count({ where: { status: CompetencyStatus.DRAFT } }),
      this.prisma.competencies.count({ where: { status: CompetencyStatus.DEPRECATED } }),
      this.prisma.competencies.groupBy({
        by: ['subject'],
        _count: true,
      }),
    ]);

    return {
      total: totalCount,
      active: activeCount,
      draft: draftCount,
      deprecated: deprecatedCount,
      uniqueSubjects: subjectCount.length,
    };
  }
}
