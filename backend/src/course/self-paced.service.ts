import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSelfPacedResourceDto,
  UpdateSelfPacedResourceDto,
  SelfPacedResourceResponseDto,
} from './dto/self-paced.dto';
import { ContentStatus } from '@prisma/client';

@Injectable()
export class SelfPacedService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new self-paced resource
   */
  async createResource(
    facultyId: string,
    collegeId: string,
    dto: CreateSelfPacedResourceDto,
  ): Promise<SelfPacedResourceResponseDto> {
    const resource = await this.prisma.self_paced_resources.create({
      data: {
        facultyId,
        collegeId,
        title: dto.title,
        description: dto.description,
        resourceType: dto.resourceType,
        content: dto.content,
        subject: dto.subject,
        academicYear: dto.academicYear,
        tags: dto.tags || [],
        topicId: dto.topicId,
        competencyIds: dto.competencyIds || [],
        status: ContentStatus.ACTIVE,
      },
      include: {
        faculty: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return this.mapToResponseDto(resource);
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(file: Express.Multer.File): Promise<{ fileUrl: string }> {
    const fileUrl = `/uploads/self-paced/${file.filename}`;
    return { fileUrl };
  }

  /**
   * Update file URL for a resource
   */
  async updateResourceFile(
    resourceId: string,
    facultyId: string,
    fileUrl: string,
  ): Promise<SelfPacedResourceResponseDto> {
    // Verify ownership
    const resource = await this.prisma.self_paced_resources.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.facultyId !== facultyId) {
      throw new ForbiddenException('You can only update your own resources');
    }

    const updated = await this.prisma.self_paced_resources.update({
      where: { id: resourceId },
      data: { fileUrl },
      include: {
        faculty: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Get all resources created by a faculty member
   */
  async getFacultyResources(
    facultyId: string,
    filters?: { subject?: string; resourceType?: string },
  ): Promise<SelfPacedResourceResponseDto[]> {
    const where: any = {
      facultyId,
      status: ContentStatus.ACTIVE,
    };

    if (filters?.subject) {
      where.subject = filters.subject;
    }

    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }

    const resources = await this.prisma.self_paced_resources.findMany({
      where,
      include: {
        faculty: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return resources.map(this.mapToResponseDto);
  }

  /**
   * Get analytics for a resource
   */
  async getResourceAnalytics(resourceId: string, facultyId: string) {
    // Verify ownership
    const resource = await this.prisma.self_paced_resources.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.facultyId !== facultyId) {
      throw new ForbiddenException('You can only view analytics for your own resources');
    }

    const [totalViews, uniqueStudents, accessLogs] = await Promise.all([
      this.prisma.self_paced_access_logs.count({
        where: { resourceId },
      }),
      this.prisma.self_paced_access_logs.findMany({
        where: { resourceId },
        distinct: ['studentId'],
      }),
      this.prisma.self_paced_access_logs.findMany({
        where: { resourceId },
        orderBy: { viewedAt: 'desc' },
        take: 10,
        include: {
          student: {
            select: {
              fullName: true,
              currentAcademicYear: true,
            },
          },
        },
      }),
    ]);

    const avgTimeSpent = await this.prisma.self_paced_access_logs.aggregate({
      where: {
        resourceId,
        timeSpent: { not: null },
      },
      _avg: {
        timeSpent: true,
      },
    });

    return {
      resourceId,
      totalViews,
      uniqueStudents: uniqueStudents.length,
      averageTimeSpent: avgTimeSpent._avg.timeSpent || 0,
      recentAccess: accessLogs.map((log) => ({
        studentName: log.student.fullName,
        academicYear: log.student.currentAcademicYear,
        viewedAt: log.viewedAt,
        timeSpent: log.timeSpent,
      })),
    };
  }

  /**
   * Update a resource
   */
  async updateResource(
    resourceId: string,
    facultyId: string,
    dto: UpdateSelfPacedResourceDto,
  ): Promise<SelfPacedResourceResponseDto> {
    // Verify ownership
    const resource = await this.prisma.self_paced_resources.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.facultyId !== facultyId) {
      throw new ForbiddenException('You can only update your own resources');
    }

    const updated = await this.prisma.self_paced_resources.update({
      where: { id: resourceId },
      data: {
        title: dto.title,
        description: dto.description,
        content: dto.content,
        subject: dto.subject,
        academicYear: dto.academicYear,
        tags: dto.tags,
        topicId: dto.topicId,
        competencyIds: dto.competencyIds,
        updatedAt: new Date(),
      },
      include: {
        faculty: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Archive a resource (soft delete)
   */
  async archiveResource(resourceId: string, facultyId: string): Promise<void> {
    // Verify ownership
    const resource = await this.prisma.self_paced_resources.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.facultyId !== facultyId) {
      throw new ForbiddenException('You can only archive your own resources');
    }

    await this.prisma.self_paced_resources.update({
      where: { id: resourceId },
      data: { status: ContentStatus.INACTIVE },
    });
  }

  /**
   * Get available resources for students
   */
  async getAvailableResources(
    collegeId: string,
    filters?: { subject?: string; resourceType?: string; academicYear?: string },
  ): Promise<SelfPacedResourceResponseDto[]> {
    const where: any = {
      collegeId,
      status: ContentStatus.ACTIVE,
    };

    if (filters?.subject) {
      where.subject = filters.subject;
    }

    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }

    const resources = await this.prisma.self_paced_resources.findMany({
      where,
      include: {
        faculty: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return resources.map(this.mapToResponseDto);
  }

  /**
   * Get a resource for a student
   * Increments view count
   */
  async getResourceForStudent(
    resourceId: string,
    userId: string,
  ): Promise<SelfPacedResourceResponseDto> {
    const resource = await this.prisma.self_paced_resources.findUnique({
      where: { id: resourceId },
      include: {
        faculty: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!resource || resource.status !== ContentStatus.ACTIVE) {
      throw new NotFoundException('Resource not found');
    }

    // Increment view count
    await this.prisma.self_paced_resources.update({
      where: { id: resourceId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return this.mapToResponseDto(resource);
  }

  /**
   * Log student access to a resource
   */
  async logAccess(resourceId: string, userId: string, timeSpent?: number): Promise<void> {
    // Get student ID from user ID
    const student = await this.prisma.students.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.self_paced_access_logs.create({
      data: {
        resourceId,
        studentId: student.id,
        timeSpent,
      },
    });
  }

  /**
   * Get available subjects
   */
  async getAvailableSubjects(collegeId: string): Promise<string[]> {
    const resources = await this.prisma.self_paced_resources.findMany({
      where: {
        collegeId,
        status: ContentStatus.ACTIVE,
        subject: {
          not: null,
        },
      },
      distinct: ['subject'],
      select: {
        subject: true,
      },
    });

    return resources.map((r) => r.subject).filter((s): s is string => s !== null);
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(resource: any): SelfPacedResourceResponseDto {
    return {
      id: resource.id,
      facultyId: resource.facultyId,
      facultyName: resource.faculty?.fullName || 'Unknown',
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType,
      fileUrl: resource.fileUrl,
      content: resource.content,
      subject: resource.subject,
      topicId: resource.topicId,
      competencyIds: resource.competencyIds || [],
      academicYear: resource.academicYear,
      tags: resource.tags,
      viewCount: resource.viewCount,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}
