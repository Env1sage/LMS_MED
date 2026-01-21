import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, DepartmentStatus } from '../common/enums';
import { CreateDepartmentDto, UpdateDepartmentDto, AssignHodDto } from './dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateDepartmentDto, userId: string, collegeId: string) {
    // Check for duplicate code within college
    const existing = await this.prisma.departments.findUnique({
      where: {
        collegeId_code: {
          collegeId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Department with code ${dto.code} already exists in this college`);
    }

    const department = await this.prisma.departments.create({
      data: {
        collegeId,
        name: dto.name,
        code: dto.code,
        status: DepartmentStatus.ACTIVE,
      },
      include: {
        college: true,
      },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.DEPARTMENT_CREATED,
      entityType: 'department',
      entityId: department.id,
      description: `Department ${department.name} (${department.code}) created`,
    });

    return department;
  }

  async findAll(collegeId: string) {
    return this.prisma.departments.findMany({
      where: { collegeId },
      include: {
        hod: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            faculty_assignments: true,
            student_departments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, collegeId: string) {
    const department = await this.prisma.departments.findFirst({
      where: { id, collegeId },
      include: {
        hod: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        faculty_assignments: {
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
        },
        student_departments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                currentAcademicYear: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto, userId: string, collegeId: string) {
    const department = await this.findOne(id, collegeId);

    // Check for duplicate code if changing
    if (dto.code && dto.code !== department.code) {
      const existing = await this.prisma.departments.findUnique({
        where: {
          collegeId_code: {
            collegeId,
            code: dto.code,
          },
        },
      });

      if (existing) {
        throw new ConflictException(`Department with code ${dto.code} already exists in this college`);
      }
    }

    const updated = await this.prisma.departments.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.DEPARTMENT_UPDATED,
      entityType: 'department',
      entityId: id,
      description: `Department ${updated.name} updated`,
      metadata: dto,
    });

    return updated;
  }

  async assignHod(id: string, dto: AssignHodDto, userId: string, collegeId: string) {
    const department = await this.findOne(id, collegeId);

    // Verify the HOD user exists and is a valid role
    const hodUser = await this.prisma.users.findFirst({
      where: {
        id: dto.hodId,
        collegeId,
        role: 'COLLEGE_HOD',
        status: 'ACTIVE',
      },
    });

    if (!hodUser) {
      throw new NotFoundException('HOD user not found or not eligible');
    }

    const previousHodId = department.hodId;

    const updated = await this.prisma.departments.update({
      where: { id },
      data: {
        hodId: dto.hodId,
      },
      include: {
        hod: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Update the HOD's departmentId
    await this.prisma.users.update({
      where: { id: dto.hodId },
      data: { departmentId: id },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.HOD_ASSIGNED,
      entityType: 'department',
      entityId: id,
      description: `HOD ${hodUser.fullName} assigned to department ${department.name}`,
      metadata: {
        previousHodId,
        newHodId: dto.hodId,
      },
    });

    return updated;
  }

  async removeHod(id: string, userId: string, collegeId: string) {
    const department = await this.findOne(id, collegeId);

    if (!department.hodId) {
      throw new ConflictException('Department has no HOD assigned');
    }

    const previousHodId = department.hodId;

    const updated = await this.prisma.departments.update({
      where: { id },
      data: {
        hodId: null,
      },
    });

    // Clear the previous HOD's departmentId
    await this.prisma.users.update({
      where: { id: previousHodId },
      data: { departmentId: null },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.HOD_REMOVED,
      entityType: 'department',
      entityId: id,
      description: `HOD removed from department ${department.name}`,
      metadata: { previousHodId },
    });

    return updated;
  }

  async deactivate(id: string, userId: string, collegeId: string) {
    await this.findOne(id, collegeId);

    const updated = await this.prisma.departments.update({
      where: { id },
      data: {
        status: DepartmentStatus.INACTIVE,
      },
    });

    await this.auditService.log({
      userId,
      collegeId,
      action: AuditAction.DEPARTMENT_DEACTIVATED,
      entityType: 'department',
      entityId: id,
      description: `Department ${updated.name} deactivated`,
    });

    return updated;
  }

  // Get departments for HOD (scoped to their department only)
  async findForHod(userId: string, collegeId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'COLLEGE_HOD') {
      throw new ForbiddenException('User is not an HOD');
    }

    // HOD can only see their own department
    return this.prisma.departments.findMany({
      where: {
        collegeId,
        hodId: userId,
      },
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
            permissions: true,
          },
        },
        student_departments: {
          include: {
            student: true,
          },
        },
      },
    });
  }
}
