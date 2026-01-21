import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, FacultyStatus } from '../common/enums';
import { AssignFacultyDto, UpdateFacultyAssignmentDto } from './dto/faculty-assignment.dto';

@Injectable()
export class FacultyAssignmentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async assignFacultyToDepartment(dto: AssignFacultyDto, userId: string, collegeId: string) {
    // Verify the user exists and is faculty
    const faculty = await this.prisma.users.findFirst({
      where: {
        id: dto.userId,
        collegeId,
        role: 'FACULTY',
        status: 'ACTIVE',
      },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty user not found or not eligible');
    }

    // Verify the department exists
    const department = await this.prisma.departments.findFirst({
      where: {
        id: dto.departmentId,
        collegeId,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Verify the permission set exists
    const permission = await this.prisma.faculty_permissions.findFirst({
      where: {
        id: dto.permissionId,
        collegeId,
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission set not found');
    }

    // Check for existing assignment
    const existing = await this.prisma.faculty_assignments.findUnique({
      where: {
        userId_departmentId: {
          userId: dto.userId,
          departmentId: dto.departmentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Faculty is already assigned to this department');
    }

    const assignment = await this.prisma.faculty_assignments.create({
      data: {
        userId: dto.userId,
        departmentId: dto.departmentId,
        permissionId: dto.permissionId,
        subjects: dto.subjects || [],
        status: FacultyStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: true,
        permissions: true,
      },
    });

    // Update user's departmentId
    await this.prisma.users.update({
      where: { id: dto.userId },
      data: { departmentId: dto.departmentId },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.FACULTY_ASSIGNED_TO_DEPARTMENT,
      entityType: 'faculty_assignment',
      entityId: assignment.id,
      description: `Faculty ${faculty.fullName} assigned to department ${department.name} with permission set ${permission.name}`,
      metadata: dto,
    });

    return assignment;
  }

  async findAllByDepartment(departmentId: string, collegeId: string) {
    // Verify department belongs to college
    const department = await this.prisma.departments.findFirst({
      where: { id: departmentId, collegeId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.faculty_assignments.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        permissions: true,
      },
    });
  }

  async findAllByFaculty(facultyUserId: string, collegeId: string) {
    // Verify user belongs to college
    const faculty = await this.prisma.users.findFirst({
      where: { id: facultyUserId, collegeId, role: 'FACULTY' },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    return this.prisma.faculty_assignments.findMany({
      where: { userId: facultyUserId },
      include: {
        department: true,
        permissions: true,
      },
    });
  }

  async getFacultyPermissions(facultyUserId: string, departmentId: string) {
    const assignment = await this.prisma.faculty_assignments.findUnique({
      where: {
        userId_departmentId: {
          userId: facultyUserId,
          departmentId,
        },
      },
      include: {
        permissions: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Faculty assignment not found');
    }

    return assignment.permissions;
  }

  async updateAssignment(
    assignmentId: string,
    dto: UpdateFacultyAssignmentDto,
    userId: string,
    collegeId: string,
  ) {
    const assignment = await this.prisma.faculty_assignments.findFirst({
      where: { id: assignmentId },
      include: {
        department: true,
        user: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Faculty assignment not found');
    }

    // Verify college ownership
    if (assignment.department.collegeId !== collegeId) {
      throw new ForbiddenException('Cannot update assignment from another college');
    }

    // If changing permission, verify it exists
    if (dto.permissionId) {
      const permission = await this.prisma.faculty_permissions.findFirst({
        where: { id: dto.permissionId, collegeId },
      });

      if (!permission) {
        throw new NotFoundException('Permission set not found');
      }
    }

    const updated = await this.prisma.faculty_assignments.update({
      where: { id: assignmentId },
      data: {
        permissionId: dto.permissionId,
        subjects: dto.subjects,
        status: dto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: true,
        permissions: true,
      },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.FACULTY_PERMISSIONS_CHANGED,
      entityType: 'faculty_assignment',
      entityId: assignmentId,
      description: `Faculty assignment updated for ${assignment.user.fullName}`,
      metadata: dto,
    });

    return updated;
  }

  async removeFromDepartment(
    facultyUserId: string,
    departmentId: string,
    userId: string,
    collegeId: string,
  ) {
    const assignment = await this.prisma.faculty_assignments.findUnique({
      where: {
        userId_departmentId: {
          userId: facultyUserId,
          departmentId,
        },
      },
      include: {
        department: true,
        user: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Faculty assignment not found');
    }

    // Verify college ownership
    if (assignment.department.collegeId !== collegeId) {
      throw new ForbiddenException('Cannot remove assignment from another college');
    }

    await this.prisma.faculty_assignments.delete({
      where: { id: assignment.id },
    });

    // Update user's departmentId if this was their only assignment
    const remainingAssignments = await this.prisma.faculty_assignments.count({
      where: { userId: facultyUserId },
    });

    if (remainingAssignments === 0) {
      await this.prisma.users.update({
        where: { id: facultyUserId },
        data: { departmentId: null },
      });
    }

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.FACULTY_REMOVED_FROM_DEPARTMENT,
      entityType: 'faculty_assignment',
      entityId: assignment.id,
      description: `Faculty ${assignment.user.fullName} removed from department ${assignment.department.name}`,
    });

    return { message: 'Faculty removed from department successfully' };
  }

  // Check if faculty has specific permission
  async checkPermission(
    facultyUserId: string,
    departmentId: string,
    permission: keyof Omit<
      NonNullable<Awaited<ReturnType<typeof this.prisma.faculty_permissions.findFirst>>>,
      'id' | 'name' | 'collegeId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<boolean> {
    const assignment = await this.prisma.faculty_assignments.findUnique({
      where: {
        userId_departmentId: {
          userId: facultyUserId,
          departmentId,
        },
      },
      include: {
        permissions: true,
      },
    });

    if (!assignment || !assignment.permissions) {
      return false;
    }

    return assignment.permissions[permission] === true;
  }
}
