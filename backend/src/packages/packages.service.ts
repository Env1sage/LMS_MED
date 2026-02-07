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
    const contentTypes = [...new Set(assignments.flatMap(a => a.package.contentTypes))];

    // Get learning units from these publishers that match package subjects
    const learningUnits = await this.prisma.learning_units.findMany({
      where: {
        publisherId: { in: publisherIds },
        subject: { in: subjects.length > 0 ? subjects : undefined },
        type: contentTypes.length > 0 ? { in: contentTypes } : undefined,
        status: 'ACTIVE',
      },
      include: {
        publishers: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      packages: assignments.map(a => ({
        id: a.package.id,
        name: a.package.name,
        publisherId: a.package.publisherId,
        subjects: a.package.subjects,
        contentTypes: a.package.contentTypes,
      })),
      learningUnits,
      subjects,
      contentTypes,
    };
  }
}
