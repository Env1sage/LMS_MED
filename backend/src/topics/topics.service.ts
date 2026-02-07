import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTopicDto, UpdateTopicDto, SearchTopicsDto } from './dto/topics.dto';
import { ContentStatus, AuditAction } from '@prisma/client';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new topic (CBME repository)
   */
  async create(dto: CreateTopicDto, userId: string) {
    // Check if topic code already exists
    const existingTopic = await this.prisma.topics.findUnique({
      where: { code: dto.code },
    });

    if (existingTopic) {
      throw new ConflictException(`Topic with code ${dto.code} already exists`);
    }

    const topic = await this.prisma.topics.create({
      data: {
        subject: dto.subject,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        academicYear: dto.academicYear,
        status: dto.status || ContentStatus.ACTIVE,
      },
    });

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.TOPIC_CREATED,
      entityType: 'TOPIC',
      entityId: topic.id,
      description: `Created topic: ${topic.name} (${topic.code})`,
    });

    return topic;
  }

  /**
   * Get all topics with optional filters
   */
  async findAll(filters?: SearchTopicsDto) {
    const where: any = {};

    if (filters?.subject) {
      where.subject = filters.subject;
    }

    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }

    if (filters?.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { code: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.topics.findMany({
      where,
      include: {
        _count: {
          select: {
            competencies: true,
            learning_units: true,
            mcqs: true,
          },
        },
      },
      orderBy: [{ subject: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Search topics for autocomplete/dropdown
   */
  async search(query: string, subject?: string) {
    const where: any = {
      status: ContentStatus.ACTIVE,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (subject) {
      where.subject = subject;
    }

    return this.prisma.topics.findMany({
      where,
      take: 20,
      select: {
        id: true,
        code: true,
        name: true,
        subject: true,
        academicYear: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get topics by subject
   */
  async findBySubject(subject: string) {
    return this.prisma.topics.findMany({
      where: {
        subject,
        status: ContentStatus.ACTIVE,
      },
      include: {
        _count: {
          select: {
            competencies: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get competencies linked to a specific topic
   * Used for auto-loading competencies when topic is selected
   * First tries to get competencies directly linked to topic via topicId
   * If none found, falls back to competencies matching the topic's subject
   */
  async getCompetenciesByTopic(topicId: string) {
    // First verify the topic exists
    const topic = await this.prisma.topics.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Try to get competencies directly linked to this topic
    let competencies = await this.prisma.competencies.findMany({
      where: {
        topicId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        domain: true,
        academicLevel: true,
        subject: true,
      },
      orderBy: { code: 'asc' },
    });

    // If no direct topic link, fall back to subject-based matching
    if (competencies.length === 0) {
      competencies = await this.prisma.competencies.findMany({
        where: {
          subject: topic.subject,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          domain: true,
          academicLevel: true,
          subject: true,
        },
        orderBy: { code: 'asc' },
        take: 50, // Limit to 50 competencies for subject-based matching
      });
    }

    return {
      topic: {
        id: topic.id,
        name: topic.name,
        code: topic.code,
        subject: topic.subject,
      },
      competencies,
      count: competencies.length,
    };
  }

  /**
   * Get a single topic by ID
   */
  async findOne(id: string) {
    const topic = await this.prisma.topics.findUnique({
      where: { id },
      include: {
        competencies: true,
        _count: {
          select: {
            learning_units: true,
            mcqs: true,
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    return topic;
  }

  /**
   * Get topic by code
   */
  async findByCode(code: string) {
    const topic = await this.prisma.topics.findUnique({
      where: { code },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with code ${code} not found`);
    }

    return topic;
  }

  /**
   * Update a topic
   */
  async update(id: string, dto: UpdateTopicDto, userId: string) {
    const existing = await this.findOne(id);

    const topic = await this.prisma.topics.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId,
      action: AuditAction.TOPIC_UPDATED,
      entityType: 'TOPIC',
      entityId: topic.id,
      description: `Updated topic: ${topic.name}`,
    });

    return topic;
  }

  /**
   * Delete a topic (soft delete by setting status to INACTIVE)
   */
  async delete(id: string, userId: string) {
    const existing = await this.findOne(id);

    const topic = await this.prisma.topics.update({
      where: { id },
      data: { status: ContentStatus.INACTIVE },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.TOPIC_DEACTIVATED,
      entityType: 'TOPIC',
      entityId: topic.id,
      description: `Deactivated topic: ${topic.name}`,
    });

    return topic;
  }

  /**
   * Get all unique subjects that have topics
   */
  async getSubjects() {
    const topics = await this.prisma.topics.findMany({
      where: { status: ContentStatus.ACTIVE },
      select: { subject: true },
      distinct: ['subject'],
      orderBy: { subject: 'asc' },
    });

    return topics.map(t => t.subject);
  }

  /**
   * Bulk import topics (for CBME repository initialization)
   */
  async bulkImport(topics: CreateTopicDto[], userId: string) {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const topicDto of topics) {
      try {
        const existing = await this.prisma.topics.findUnique({
          where: { code: topicDto.code },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await this.prisma.topics.create({
          data: {
            subject: topicDto.subject,
            name: topicDto.name,
            code: topicDto.code,
            description: topicDto.description,
            academicYear: topicDto.academicYear,
            status: topicDto.status || ContentStatus.ACTIVE,
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push(`Failed to create topic ${topicDto.code}: ${error.message}`);
      }
    }

    await this.auditService.log({
      userId,
      action: AuditAction.TOPICS_BULK_IMPORTED,
      entityType: 'TOPIC',
      description: `Bulk imported topics: ${results.created} created, ${results.skipped} skipped`,
    });

    return results;
  }
}
