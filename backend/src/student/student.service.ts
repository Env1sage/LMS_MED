import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { BulkPromoteStudentsDto } from './dto/bulk-promote-students.dto';
import { ResetCredentialsDto } from './dto/reset-credentials.dto';
import { StudentStatus, UserRole, UserStatus, AuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new student (COLLEGE_ADMIN only)
   * Creates both User and Student records
   */
  async create(createDto: CreateStudentDto, adminUserId: string, collegeId: string) {
    // Check if email already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate year logic
    if (createDto.expectedPassingYear <= createDto.yearOfAdmission) {
      throw new BadRequestException('Expected passing year must be after admission year');
    }

    // Generate temporary password if not provided
    const tempPassword = createDto.temporaryPassword || this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user and student in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.users.create({
        data: {
          id: uuidv4(),
          email: createDto.email,
          passwordHash,
          fullName: createDto.fullName,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          collegeId,
          updatedAt: new Date(),
        },
      });

      // Create student profile
      const student = await tx.students.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          collegeId,
          fullName: createDto.fullName,
          yearOfAdmission: createDto.yearOfAdmission,
          expectedPassingYear: createDto.expectedPassingYear,
          currentAcademicYear: createDto.currentAcademicYear,
          status: StudentStatus.ACTIVE,
          updatedAt: new Date(),
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              status: true,
            },
          },
          colleges: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return { student, tempPassword };
    });

    // Audit log
    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_CREATED,
      entityType: 'Student',
      entityId: result.student.id,
      description: `Created student: ${createDto.fullName} (${createDto.email})`,
    });

    return {
      ...result.student,
      temporaryPassword: tempPassword,
    };
  }

  /**
   * Get all students for a college with filtering
   */
  async findAll(collegeId: string, query: QueryStudentDto) {
    const { status, currentAcademicYear, search, page = 1, limit = 20 } = query;

    const where: any = { collegeId };

    if (status) where.status = status;
    if (currentAcademicYear) where.currentAcademicYear = currentAcademicYear;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.students.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              status: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { currentAcademicYear: 'asc' },
          { fullName: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.students.count({ where }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get student by ID
   */
  async findOne(id: string, collegeId: string) {
    const student = await this.prisma.students.findFirst({
      where: { id, collegeId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        colleges: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  /**
   * Update student (College admin only, own college)
   */
  async update(id: string, updateDto: UpdateStudentDto, adminUserId: string, collegeId: string) {
    const student = await this.findOne(id, collegeId);

    // Validate year logic if updating
    if (updateDto.expectedPassingYear && updateDto.yearOfAdmission) {
      if (updateDto.expectedPassingYear <= updateDto.yearOfAdmission) {
        throw new BadRequestException('Expected passing year must be after admission year');
      }
    }

    const updated = await this.prisma.students.update({
      where: { id },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_UPDATED,
      entityType: 'Student',
      entityId: id,
      description: `Updated student: ${student.fullName}`,
    });

    return updated;
  }

  /**
   * Activate student
   */
  async activate(id: string, adminUserId: string, collegeId: string) {
    const student = await this.findOne(id, collegeId);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update student status
      const updatedStudent = await tx.students.update({
        where: { id },
        data: { status: StudentStatus.ACTIVE },
      });

      // Update user status
      await tx.users.update({
        where: { id: student.userId },
        data: { status: UserStatus.ACTIVE },
      });

      return updatedStudent;
    });

    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_ACTIVATED,
      entityType: 'Student',
      entityId: id,
      description: `Activated student: ${student.fullName}`,
    });

    return updated;
  }

  /**
   * Deactivate student (blocks access immediately)
   */
  async deactivate(id: string, adminUserId: string, collegeId: string) {
    const student = await this.findOne(id, collegeId);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update student status
      const updatedStudent = await tx.students.update({
        where: { id },
        data: { status: StudentStatus.INACTIVE },
      });

      // Update user status and invalidate sessions
      await tx.users.update({
        where: { id: student.userId },
        data: { status: UserStatus.INACTIVE },
      });

      // Invalidate all active sessions
      await tx.user_sessions.updateMany({
        where: { userId: student.userId, isActive: true },
        data: { isActive: false },
      });

      // Revoke all refresh tokens
      await tx.refresh_tokens.updateMany({
        where: { userId: student.userId, isRevoked: false },
        data: { isRevoked: true },
      });

      return updatedStudent;
    });

    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_DEACTIVATED,
      entityType: 'Student',
      entityId: id,
      description: `Deactivated student: ${student.fullName}`,
    });

    return updated;
  }

  /**
   * Bulk promote students to next academic year
   */
  async bulkPromote(dto: BulkPromoteStudentsDto, adminUserId: string, collegeId: string) {
    // Verify all students belong to the college
    const students = await this.prisma.students.findMany({
      where: {
        id: { in: dto.studentIds },
        collegeId,
      },
    });

    if (students.length !== dto.studentIds.length) {
      throw new ForbiddenException('Some students do not belong to your college');
    }

    // Update all students
    const updated = await this.prisma.students.updateMany({
      where: {
        id: { in: dto.studentIds },
        collegeId,
      },
      data: {
        currentAcademicYear: dto.newAcademicYear,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_BULK_PROMOTED,
      entityType: 'Student',
      description: `Bulk promoted ${updated.count} students to ${dto.newAcademicYear}`,
      metadata: { count: updated.count, newYear: dto.newAcademicYear },
    });

    return {
      message: `Successfully promoted ${updated.count} students`,
      count: updated.count,
    };
  }

  /**
   * Reset student credentials (generates new temporary password)
   */
  async resetCredentials(id: string, dto: ResetCredentialsDto, adminUserId: string, collegeId: string) {
    const student = await this.findOne(id, collegeId);

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      // Update password
      await tx.users.update({
        where: { id: student.userId },
        data: { passwordHash },
      });

      // Invalidate all sessions
      await tx.user_sessions.updateMany({
        where: { userId: student.userId, isActive: true },
        data: { isActive: false },
      });

      // Revoke all refresh tokens
      await tx.refresh_tokens.updateMany({
        where: { userId: student.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_CREDENTIALS_RESET,
      entityType: 'Student',
      entityId: id,
      description: `Reset credentials for student: ${student.fullName}`,
    });

    return {
      message: 'Credentials reset successfully',
      newPassword: dto.newPassword,
    };
  }

  /**
   * Get student statistics for college
   */
  async getStats(collegeId: string) {
    const [total, byStatus, byYear] = await Promise.all([
      this.prisma.students.count({ where: { collegeId } }),
      this.prisma.students.groupBy({
        by: ['status'],
        where: { collegeId },
        _count: true,
      }),
      this.prisma.students.groupBy({
        by: ['currentAcademicYear'],
        where: { collegeId },
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byYear: byYear.map(y => ({ year: y.currentAcademicYear, count: y._count })),
    };
  }

  /**
   * Generate a temporary password
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
