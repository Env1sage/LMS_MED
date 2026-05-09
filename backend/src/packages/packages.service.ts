import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePackageDto, UpdatePackageDto, AssignPackageToCollegeDto, UpdatePackageAssignmentDto } from './dto/packages.dto';
import { PackageStatus, PackageAssignmentStatus, AuditAction } from '@prisma/client';

@Injectable()
export class PackagesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new package (Publisher Admin creates packages)
   */
  async create(dto: CreatePackageDto, userId: string, publisherId: string) {
    const pkg = await this.prisma.packages.create({
      data: {
        publisherId: dto.publisherId || publisherId,
        name: dto.name,
        description: dto.description,
        subjects: dto.subjects || [],
        contentTypes: dto.contentTypes || [],
        status: dto.status || PackageStatus.DRAFT,
      },
    });

    await this.auditService.log({
      userId,
      publisherId,
      action: AuditAction.PACKAGE_CREATED,
      entityType: 'PACKAGE',
      entityId: pkg.id,
      description: `Created package: ${pkg.name}`,
    });

    return pkg;
  }

  /**
   * Get all packages for a publisher
   */
  async findByPublisher(publisherId: string) {
    return this.prisma.packages.findMany({
      where: { publisherId },
      include: {
        _count: {
          select: {
            college_packages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all packages (Bitflow Owner view)
   */
  async findAll() {
    return this.prisma.packages.findMany({
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            college_packages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Assert that a package is assigned to a given college (used for access control)
   * Throws ForbiddenException if not assigned.
   */
  async assertPackageAssignedToCollege(packageId: string, collegeId: string): Promise<void> {
    const assignment = await this.prisma.college_packages.findFirst({
      where: { packageId, collegeId, status: { not: 'CANCELLED' } },
    });
    if (!assignment) {
      throw new ForbiddenException('Package is not assigned to your college');
    }
  }

  /**
   * Get a single package by ID
   */
  async findOne(id: string) {
    const pkg = await this.prisma.packages.findUnique({
      where: { id },
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        college_packages: {
          include: {
            college: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return pkg;
  }

  /**
   * Update a package
   */
  async update(id: string, dto: UpdatePackageDto, userId: string, publisherId?: string) {
    const existing = await this.findOne(id);

    // If publisherId is provided, check ownership
    if (publisherId && existing.publisherId !== publisherId) {
      throw new ForbiddenException('You can only update your own packages');
    }

    const pkg = await this.prisma.packages.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId,
      publisherId: existing.publisherId,
      action: AuditAction.PACKAGE_UPDATED,
      entityType: 'PACKAGE',
      entityId: pkg.id,
      description: `Updated package: ${pkg.name}`,
    });

    return pkg;
  }

  /**
   * Delete a package (soft delete)
   */
  async delete(id: string, userId: string, publisherId?: string) {
    const existing = await this.findOne(id);

    if (publisherId && existing.publisherId !== publisherId) {
      throw new ForbiddenException('You can only delete your own packages');
    }

    const pkg = await this.prisma.packages.update({
      where: { id },
      data: { status: PackageStatus.INACTIVE },
    });

    await this.auditService.log({
      userId,
      publisherId: existing.publisherId,
      action: AuditAction.PACKAGE_DEACTIVATED,
      entityType: 'PACKAGE',
      entityId: pkg.id,
      description: `Deactivated package: ${pkg.name}`,
    });

    return pkg;
  }

  // =====================================================
  // PACKAGE ASSIGNMENT (Bitflow Owner operations)
  // =====================================================

  /**
   * Assign a package to a college (Bitflow Owner only)
   */
  async assignToCollege(dto: AssignPackageToCollegeDto, userId: string) {
    // Check if package exists and is active
    const pkg = await this.prisma.packages.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg) {
      throw new NotFoundException(`Package with ID ${dto.packageId} not found`);
    }

    if (pkg.status !== PackageStatus.ACTIVE) {
      throw new ConflictException('Cannot assign an inactive package');
    }

    // Check if college exists
    const college = await this.prisma.colleges.findUnique({
      where: { id: dto.collegeId },
    });

    if (!college) {
      throw new NotFoundException(`College with ID ${dto.collegeId} not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.college_packages.findUnique({
      where: {
        collegeId_packageId: {
          collegeId: dto.collegeId,
          packageId: dto.packageId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Package is already assigned to this college');
    }

    const assignment = await this.prisma.college_packages.create({
      data: {
        collegeId: dto.collegeId,
        packageId: dto.packageId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignedBy: userId,
        status: PackageAssignmentStatus.ACTIVE,
      },
      include: {
        college: {
          select: {
            name: true,
            code: true,
          },
        },
        package: {
          select: {
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      collegeId: dto.collegeId,
      action: AuditAction.PACKAGE_ASSIGNED,
      entityType: 'PACKAGE_ASSIGNMENT',
      entityId: assignment.id,
      description: `Assigned package ${assignment.package.name} to college ${assignment.college.name}`,
    });

    return assignment;
  }

  /**
   * Get all package assignments for a college
   */
  async getCollegePackages(collegeId: string) {
    return this.prisma.college_packages.findMany({
      where: { collegeId },
      include: {
        package: {
          include: {
            publisher: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Get all package assignments
   */
  async getAllAssignments() {
    return this.prisma.college_packages.findMany({
      include: {
        college: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        package: {
          include: {
            publisher: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a package assignment
   */
  async updateAssignment(id: string, dto: UpdatePackageAssignmentDto, userId: string) {
    const existing = await this.prisma.college_packages.findUnique({
      where: { id },
      include: {
        college: { select: { name: true } },
        package: { select: { name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Package assignment with ID ${id} not found`);
    }

    const assignment = await this.prisma.college_packages.update({
      where: { id },
      data: {
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      collegeId: existing.collegeId,
      action: AuditAction.PACKAGE_ASSIGNMENT_UPDATED,
      entityType: 'PACKAGE_ASSIGNMENT',
      entityId: assignment.id,
      description: `Updated package assignment: ${existing.package.name} for ${existing.college.name}`,
    });

    return assignment;
  }

  /**
   * Remove a package assignment
   */
  async removeAssignment(id: string, userId: string) {
    const existing = await this.prisma.college_packages.findUnique({
      where: { id },
      include: {
        college: { select: { name: true } },
        package: { select: { name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Package assignment with ID ${id} not found`);
    }

    const assignment = await this.prisma.college_packages.update({
      where: { id },
      data: { status: PackageAssignmentStatus.CANCELLED },
    });

    await this.auditService.log({
      userId,
      collegeId: existing.collegeId,
      action: AuditAction.PACKAGE_ASSIGNMENT_CANCELLED,
      entityType: 'PACKAGE_ASSIGNMENT',
      entityId: assignment.id,
      description: `Cancelled package assignment: ${existing.package.name} for ${existing.college.name}`,
    });

    return assignment;
  }

  /**
   * Get learning units available to a college based on assigned packages
   * This ensures faculty can only use content from packages assigned to their college
   */
  /**
   * Get all learning units within a specific package (by publisher + subjects + content types)
   */
  async getPackageContent(packageId: string) {
    const pkg = await this.findOne(packageId);

    const contentTypes: string[] = (pkg.contentTypes as string[]) || [];
    const nonMcqTypes = contentTypes.filter(t => t !== 'MCQ');
    const includesMcq = contentTypes.includes('MCQ') || contentTypes.length === 0;

    // Query regular learning_units for non-MCQ types
    let learningUnits: any[] = [];
    if (nonMcqTypes.length > 0 || (!includesMcq)) {
      const where: any = { publisherId: pkg.publisherId, status: 'ACTIVE' };
      if (pkg.subjects && pkg.subjects.length > 0) {
        where.subject = { in: pkg.subjects };
      }
      if (nonMcqTypes.length > 0) {
        where.type = { in: nonMcqTypes };
      }
      learningUnits = await this.prisma.learning_units.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          subject: true,
          topic: true,
          difficultyLevel: true,
          estimatedDuration: true,
          status: true,
          fileFormat: true,
          coverImageUrl: true,
          createdAt: true,
          publishers: { select: { id: true, name: true } },
        },
        orderBy: [{ subject: 'asc' }, { title: 'asc' }],
      });
    }

    // Query mcqs table when MCQ type is included
    let mcqUnits: any[] = [];
    if (includesMcq || contentTypes.includes('MCQ')) {
      const mcqWhere: any = { publisherId: pkg.publisherId, status: 'PUBLISHED' };
      if (pkg.subjects && pkg.subjects.length > 0) {
        mcqWhere.subject = { in: pkg.subjects };
      }
      const mcqs = await this.prisma.mcqs.findMany({
        where: mcqWhere,
        select: {
          id: true,
          question: true,
          subject: true,
          topic: true,
          difficultyLevel: true,
          mcqType: true,
          status: true,
          createdAt: true,
          publisher: { select: { id: true, name: true } },
        },
        orderBy: [{ subject: 'asc' }, { createdAt: 'asc' }],
      });
      // Map MCQs to the same shape as learning_units for consistent frontend display
      mcqUnits = mcqs.map(m => ({
        id: m.id,
        title: m.question.length > 100 ? m.question.substring(0, 100) + '…' : m.question,
        type: 'MCQ',
        subject: m.subject,
        topic: m.topic || null,
        difficultyLevel: m.difficultyLevel,
        estimatedDuration: 2, // 2 min per MCQ default
        status: m.status,
        fileFormat: null,
        coverImageUrl: null,
        createdAt: m.createdAt,
        publishers: m.publisher,
        mcqType: m.mcqType,
      }));
    }

    const allUnits = [...learningUnits, ...mcqUnits];

    return {
      package: { id: pkg.id, name: pkg.name, subjects: pkg.subjects, contentTypes: pkg.contentTypes },
      total: allUnits.length,
      learningUnits: allUnits,
    };
  }

  async getCollegeAvailableContent(collegeId: string) {
    // Get all active package assignments for this college
    const assignments = await this.prisma.college_packages.findMany({
      where: {
        collegeId,
        status: PackageAssignmentStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            publisherId: true,
            subjects: true,
            contentTypes: true,
          },
        },
      },
    });

    if (assignments.length === 0) {
      return {
        packages: [],
        learningUnits: [],
        subjects: [],
        message: 'No active packages assigned to this college',
      };
    }

    // Collect all publisher IDs and subjects from packages
    const publisherIds = [...new Set(assignments.map(a => a.package.publisherId))];
    const subjects = [...new Set(assignments.flatMap(a => a.package.subjects))];
    const contentTypes = [...new Set(assignments.flatMap(a => a.package.contentTypes as string[]))];

    const nonMcqTypes = contentTypes.filter(t => t !== 'MCQ');
    const includesMcq = contentTypes.includes('MCQ');

    // Get non-MCQ learning units
    let learningUnits: any[] = [];
    if (nonMcqTypes.length > 0 || !includesMcq) {
      const where: any = {
        publisherId: { in: publisherIds },
        status: 'ACTIVE',
      };
      if (subjects.length > 0) where.subject = { in: subjects };
      if (nonMcqTypes.length > 0) where.type = { in: nonMcqTypes };

      learningUnits = await this.prisma.learning_units.findMany({
        where,
        include: { publishers: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Get MCQs if MCQ type is in any assigned package
    let mcqUnits: any[] = [];
    if (includesMcq) {
      const mcqWhere: any = { publisherId: { in: publisherIds }, status: 'PUBLISHED' };
      if (subjects.length > 0) mcqWhere.subject = { in: subjects };
      const mcqs = await this.prisma.mcqs.findMany({
        where: mcqWhere,
        select: {
          id: true, question: true, subject: true, topic: true,
          difficultyLevel: true, mcqType: true, status: true, createdAt: true,
          publisher: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      mcqUnits = mcqs.map(m => ({
        id: m.id,
        title: m.question.length > 100 ? m.question.substring(0, 100) + '…' : m.question,
        type: 'MCQ',
        subject: m.subject,
        topic: m.topic || null,
        difficultyLevel: m.difficultyLevel,
        estimatedDuration: 2,
        status: m.status,
        publishers: m.publisher,
        mcqType: m.mcqType,
      }));
    }

    return {
      packages: assignments.map(a => ({
        id: a.package.id,
        name: a.package.name,
        publisherId: a.package.publisherId,
        subjects: a.package.subjects,
        contentTypes: a.package.contentTypes,
      })),
      learningUnits: [...learningUnits, ...mcqUnits],
      subjects,
      contentTypes,
    };
  }
}
