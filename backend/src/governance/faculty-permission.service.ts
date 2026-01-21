import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums';
import { CreateFacultyPermissionDto, UpdateFacultyPermissionDto } from './dto/faculty-permission.dto';

@Injectable()
export class FacultyPermissionService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateFacultyPermissionDto, userId: string, collegeId: string) {
    // Check for duplicate name within college
    const existing = await this.prisma.faculty_permissions.findUnique({
      where: {
        collegeId_name: {
          collegeId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Permission set "${dto.name}" already exists`);
    }

    const permission = await this.prisma.faculty_permissions.create({
      data: {
        collegeId,
        name: dto.name,
        canCreateCourses: dto.canCreateCourses ?? false,
        canEditCourses: dto.canEditCourses ?? false,
        canDeleteCourses: dto.canDeleteCourses ?? false,
        canCreateMcqs: dto.canCreateMcqs ?? false,
        canEditMcqs: dto.canEditMcqs ?? false,
        canDeleteMcqs: dto.canDeleteMcqs ?? false,
        canViewAnalytics: dto.canViewAnalytics ?? false,
        canAssignStudents: dto.canAssignStudents ?? false,
        canScheduleLectures: dto.canScheduleLectures ?? false,
        canUploadNotes: dto.canUploadNotes ?? false,
      },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.FACULTY_PERMISSION_CREATED,
      entityType: 'faculty_permission',
      entityId: permission.id,
      description: `Faculty permission set "${dto.name}" created`,
      metadata: dto,
    });

    return permission;
  }

  async findAll(collegeId: string) {
    return this.prisma.faculty_permissions.findMany({
      where: { collegeId },
      include: {
        _count: {
          select: {
            faculty_assignments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, collegeId: string) {
    const permission = await this.prisma.faculty_permissions.findFirst({
      where: { id, collegeId },
      include: {
        faculty_assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            department: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Faculty permission set not found');
    }

    return permission;
  }

  async update(id: string, dto: UpdateFacultyPermissionDto, userId: string, collegeId: string) {
    await this.findOne(id, collegeId);

    // Check for duplicate name if changing
    if (dto.name) {
      const existing = await this.prisma.faculty_permissions.findFirst({
        where: {
          collegeId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Permission set "${dto.name}" already exists`);
      }
    }

    const updated = await this.prisma.faculty_permissions.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.FACULTY_PERMISSION_UPDATED,
      entityType: 'faculty_permission',
      entityId: id,
      description: `Faculty permission set "${updated.name}" updated`,
      metadata: dto,
    });

    return updated;
  }

  async delete(id: string, userId: string, collegeId: string) {
    const permission = await this.findOne(id, collegeId);

    // Check if any faculty are using this permission
    const usageCount = await this.prisma.faculty_assignments.count({
      where: { permissionId: id },
    });

    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot delete permission set "${permission.name}". It is assigned to ${usageCount} faculty member(s).`,
      );
    }

    await this.prisma.faculty_permissions.delete({
      where: { id },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.FACULTY_PERMISSION_UPDATED,
      entityType: 'faculty_permission',
      entityId: id,
      description: `Faculty permission set "${permission.name}" deleted`,
    });

    return { message: 'Permission set deleted successfully' };
  }

  // Create default permission sets for a college
  async createDefaultPermissions(collegeId: string, userId: string) {
    const defaultSets = [
      {
        name: 'Full Access',
        canCreateCourses: true,
        canEditCourses: true,
        canDeleteCourses: true,
        canCreateMcqs: true,
        canEditMcqs: true,
        canDeleteMcqs: true,
        canViewAnalytics: true,
        canAssignStudents: true,
        canScheduleLectures: true,
        canUploadNotes: true,
      },
      {
        name: 'Assessment Only',
        canCreateCourses: false,
        canEditCourses: false,
        canDeleteCourses: false,
        canCreateMcqs: true,
        canEditMcqs: true,
        canDeleteMcqs: false,
        canViewAnalytics: true,
        canAssignStudents: false,
        canScheduleLectures: false,
        canUploadNotes: false,
      },
      {
        name: 'View Only',
        canCreateCourses: false,
        canEditCourses: false,
        canDeleteCourses: false,
        canCreateMcqs: false,
        canEditMcqs: false,
        canDeleteMcqs: false,
        canViewAnalytics: true,
        canAssignStudents: false,
        canScheduleLectures: false,
        canUploadNotes: false,
      },
      {
        name: 'Course Manager',
        canCreateCourses: true,
        canEditCourses: true,
        canDeleteCourses: false,
        canCreateMcqs: false,
        canEditMcqs: false,
        canDeleteMcqs: false,
        canViewAnalytics: true,
        canAssignStudents: true,
        canScheduleLectures: true,
        canUploadNotes: true,
      },
    ];

    const created = [];
    for (const set of defaultSets) {
      try {
        const permission = await this.create(
          set as CreateFacultyPermissionDto,
          userId,
          collegeId,
        );
        created.push(permission);
      } catch (e) {
        // Skip if already exists
      }
    }

    return created;
  }
}
