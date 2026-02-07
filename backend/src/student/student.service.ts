import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
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
    private emailService: EmailService,
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
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              status: true,
            },
          },
          college: {
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

    // Send credentials email to student
    try {
      await this.emailService.sendCredentialEmail({
        to: createDto.email,
        fullName: createDto.fullName,
        email: createDto.email,
        tempPassword,
        role: 'STUDENT',
        collegeName: result.student.college?.name,
      });
    } catch (error) {
      // Log but don't fail the creation
      console.error('Failed to send email:', error);
    }

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
          user: {
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
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        college: {
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
        user: {
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

    // Send email with new credentials
    try {
      await this.emailService.sendCredentialEmail({
        to: student.user.email,
        fullName: student.fullName,
        email: student.user.email,
        tempPassword: dto.newPassword,
        role: 'STUDENT',
        collegeName: student.college?.name,
      });
    } catch (error) {
      console.error('Failed to send reset credentials email:', error);
    }

    return {
      message: 'Credentials reset successfully',
      newPassword: dto.newPassword,
    };
  }

  /**
   * Delete a student permanently
   * Removes both the student record and associated user account
   */
  async delete(id: string, adminUserId: string, collegeId: string) {
    // First verify the student exists and belongs to this college
    const student = await this.prisma.students.findFirst({
      where: { id, collegeId },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID '${id}' not found in your college`);
    }

    // Delete in transaction - user deletion will cascade to student due to foreign key
    await this.prisma.$transaction(async (tx) => {
      // Delete the student record first
      await tx.students.delete({
        where: { id },
      });

      // Delete the associated user account
      await tx.users.delete({
        where: { id: student.userId },
      });
    });

    // Audit log
    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_DEACTIVATED, // Using existing action type
      entityType: 'Student',
      entityId: id,
      description: `Deleted student: ${student.fullName} (${student.user.email})`,
      metadata: { deletedEmail: student.user.email },
    });

    return {
      message: 'Student deleted successfully',
      deletedStudent: {
        id: student.id,
        fullName: student.fullName,
        email: student.user.email,
      },
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
   * Get student performance analytics for college dashboard
   * Returns top performers, students needing attention, and overall stats
   */
  async getPerformanceAnalytics(collegeId: string) {
    // Get all students with their progress data
    const studentsWithProgress = await this.prisma.students.findMany({
      where: { collegeId, status: 'ACTIVE' },
      include: {
        student_progress: {
          select: {
            courseId: true,
            status: true,
            completedSteps: true,
            courses: {
              select: { 
                title: true,
                learning_flow_steps: { select: { id: true } }
              }
            }
          }
        },
        test_attempts: {
          where: { status: 'SUBMITTED' },
          select: {
            totalScore: true,
            percentageScore: true,
            test: { select: { totalMarks: true, title: true } }
          }
        },
        student_departments: {
          include: { department: { select: { name: true } } }
        }
      }
    });

    // Calculate performance score for each student
    const studentScores = studentsWithProgress.map(student => {
      // Calculate course completion rate
      let totalSteps = 0;
      let completedSteps = 0;
      student.student_progress.forEach((p: any) => {
        totalSteps += p.courses?.learning_flow_steps?.length || 0;
        completedSteps += p.completedSteps?.length || 0;
      });
      const completionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

      // Calculate average test score
      const testScores = student.test_attempts.map((t: any) => t.percentageScore || 0);
      const avgTestScore = testScores.length > 0 
        ? testScores.reduce((a: number, b: number) => a + b, 0) / testScores.length 
        : 0;

      // Combined performance score (60% tests, 40% course completion)
      const performanceScore = Math.round((avgTestScore * 0.6) + (completionRate * 0.4));

      return {
        id: student.id,
        name: student.fullName,
        year: student.currentAcademicYear,
        department: student.student_departments[0]?.department?.name || 'General',
        score: performanceScore,
        completionRate: Math.round(completionRate),
        avgTestScore: Math.round(avgTestScore),
        coursesCompleted: student.student_progress.filter((p: any) => p.status === 'COMPLETED').length,
        totalCourses: student.student_progress.length,
        testsAttempted: student.test_attempts.length
      };
    });

    // Sort and categorize
    const sortedByScore = [...studentScores].sort((a, b) => b.score - a.score);
    
    const topPerformers = sortedByScore.filter(s => s.score >= 80).slice(0, 10);
    const needAttention = sortedByScore.filter(s => s.score < 60 && s.score > 0).slice(0, 10);
    const inProgress = sortedByScore.filter(s => s.score >= 60 && s.score < 80);

    // Overall stats
    const activeScores = studentScores.filter(s => s.totalCourses > 0 || s.testsAttempted > 0);
    const overallAvgScore = activeScores.length > 0
      ? Math.round(activeScores.reduce((sum, s) => sum + s.score, 0) / activeScores.length)
      : 0;

    // Year-wise breakdown
    const yearGroups = studentScores.reduce((acc, s) => {
      if (!acc[s.year]) acc[s.year] = [];
      acc[s.year].push(s);
      return acc;
    }, {} as Record<string, typeof studentScores>);

    const yearWiseStats = Object.entries(yearGroups).map(([year, students]) => ({
      year,
      count: students.length,
      avgScore: students.length > 0 
        ? Math.round(students.reduce((sum, s) => sum + s.score, 0) / students.length)
        : 0,
      topPerformersCount: students.filter(s => s.score >= 80).length,
      needAttentionCount: students.filter(s => s.score < 60 && s.score > 0).length
    }));

    return {
      summary: {
        totalStudents: studentScores.length,
        activeStudents: activeScores.length,
        overallAvgScore,
        topPerformersCount: topPerformers.length,
        needAttentionCount: needAttention.length
      },
      topPerformers,
      needAttention,
      yearWiseStats,
      allStudents: sortedByScore
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

  /**
   * Bulk upload students from CSV buffer
   * CSV format: fullName,email,yearOfAdmission,expectedPassingYear,currentAcademicYear
   */
  async bulkUploadFromCSV(buffer: Buffer, adminUserId: string, collegeId: string) {
    const csvContent = buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredColumns = ['fullname', 'email', 'yearofadmission', 'expectedpassingyear', 'currentacademicyear'];
    
    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        throw new BadRequestException(`Missing required column: ${col}`);
      }
    }

    const getIndex = (name: string) => header.indexOf(name);

    // Get college info for emails
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
      select: { name: true },
    });

    const result = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; email: string; error: string }[],
      createdStudents: [] as { fullName: string; email: string; tempPassword: string }[],
      emailsSent: 0,
      emailsFailed: 0,
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const rowNum = i + 1;

      try {
        const fullName = values[getIndex('fullname')];
        const email = values[getIndex('email')];
        const yearOfAdmission = parseInt(values[getIndex('yearofadmission')]);
        const expectedPassingYear = parseInt(values[getIndex('expectedpassingyear')]);
        const currentAcademicYear = values[getIndex('currentacademicyear')] as any;

        // Validate
        if (!fullName || !email) {
          throw new Error('Missing fullName or email');
        }

        if (!email.includes('@')) {
          throw new Error('Invalid email format');
        }

        if (isNaN(yearOfAdmission) || isNaN(expectedPassingYear)) {
          throw new Error('Invalid year format');
        }

        if (expectedPassingYear <= yearOfAdmission) {
          throw new Error('Expected passing year must be after admission year');
        }

        const validYears = ['FIRST_YEAR', 'SECOND_YEAR', 'THIRD_YEAR', 'FOURTH_YEAR', 'FIFTH_YEAR', 'INTERNSHIP'];
        if (!validYears.includes(currentAcademicYear)) {
          throw new Error(`Invalid academic year. Must be one of: ${validYears.join(', ')}`);
        }

        // Check if email already exists
        const existingUser = await this.prisma.users.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new Error('Email already registered');
        }

        // Generate password and create student
        const tempPassword = this.generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        await this.prisma.$transaction(async (tx) => {
          const user = await tx.users.create({
            data: {
              id: uuidv4(),
              email,
              passwordHash,
              fullName,
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
              collegeId,
              updatedAt: new Date(),
            },
          });

          await tx.students.create({
            data: {
              id: uuidv4(),
              userId: user.id,
              collegeId,
              fullName,
              yearOfAdmission,
              expectedPassingYear,
              currentAcademicYear,
              status: StudentStatus.ACTIVE,
              updatedAt: new Date(),
            },
          });
        });

        result.success++;
        result.createdStudents.push({ fullName, email, tempPassword });

      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          email: values[getIndex('email')] || 'unknown',
          error: error.message || 'Unknown error',
        });
      }
    }

    // Send bulk emails
    if (result.createdStudents.length > 0) {
      const emailResults = await this.emailService.sendBulkCredentialEmails(
        result.createdStudents.map(s => ({
          to: s.email,
          fullName: s.fullName,
          email: s.email,
          tempPassword: s.tempPassword,
          role: 'STUDENT' as const,
          collegeName: college?.name,
        }))
      );

      result.emailsSent = emailResults.success.length;
      result.emailsFailed = emailResults.failed.length;
    }

    // Audit log
    await this.auditService.log({
      userId: adminUserId,
      collegeId,
      action: AuditAction.STUDENT_BULK_CREATED,
      entityType: 'Student',
      description: `Bulk uploaded ${result.success} students (${result.failed} failed)`,
      metadata: { success: result.success, failed: result.failed },
    });

    return result;
  }
}
