import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { EmailService } from '../email/email.service';
import { CreateFacultyUserDto } from './dto/faculty-user.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

@Injectable()
export class FacultyUserService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
  ) {}

  async findAllFacultyInCollege(collegeId: string) {
    return this.prisma.users.findMany({
      where: {
        collegeId,
        role: 'FACULTY',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findFacultyInDepartment(departmentId: string) {
    const assignments = await this.prisma.faculty_assignments.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { user: { fullName: 'asc' } },
    });
    return assignments.map(a => a.user).filter(Boolean);
  }

  async findFacultyInHodDepartment(hodUserId: string, collegeId: string) {
    const hodUser = await this.prisma.users.findUnique({
      where: { id: hodUserId },
      select: { departmentId: true },
    });
    let departmentId = hodUser?.departmentId ?? null;
    if (!departmentId) {
      const dept = await this.prisma.departments.findFirst({
        where: { hodId: hodUserId, collegeId },
        select: { id: true },
      });
      departmentId = dept?.id ?? null;
    }
    if (!departmentId) return [];
    return this.findFacultyInDepartment(departmentId);
  }

  async findStudentsInHodDepartment(
    hodUserId: string,
    collegeId: string,
    query: { page?: number; limit?: number; search?: string; status?: string; currentAcademicYear?: string } = {},
  ) {
    const hodUser = await this.prisma.users.findUnique({
      where: { id: hodUserId },
      select: { departmentId: true },
    });
    let departmentId = hodUser?.departmentId ?? null;
    if (!departmentId) {
      const dept = await this.prisma.departments.findFirst({
        where: { hodId: hodUserId, collegeId },
        select: { id: true },
      });
      departmentId = dept?.id ?? null;
    }
    if (!departmentId) {
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    const { page = 1, limit = 20, search, status, currentAcademicYear } = query;
    const studentWhere: any = { collegeId };
    if (status) studentWhere.status = status;
    if (currentAcademicYear) studentWhere.currentAcademicYear = currentAcademicYear;
    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const sdWhere = { departmentId, student: studentWhere };
    const [sdList, total] = await Promise.all([
      this.prisma.student_departments.findMany({
        where: sdWhere,
        include: {
          student: {
            include: {
              user: {
                select: { id: true, email: true, status: true, lastLoginAt: true },
              },
            },
          },
        },
        orderBy: [{ student: { status: 'asc' } }, { student: { fullName: 'asc' } }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student_departments.count({ where: sdWhere }),
    ]);
    return {
      data: sdList.map(sd => sd.student).filter(Boolean),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createFacultyUser(
    dto: CreateFacultyUserDto,
    createdById: string,
    collegeId: string,
  ) {
    // Check if email already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Enforce account limit + fetch college name for email
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
      select: { maxStudents: true, name: true },
    });
    const limit = college?.maxStudents ?? 500;
    const currentCount = await this.prisma.users.count({
      where: { collegeId, status: { not: 'INACTIVE' } },
    });
    if (currentCount >= limit) {
      throw new BadRequestException(
        `Account limit reached. Your college is allowed a maximum of ${limit} accounts (currently ${currentCount} active). Contact the platform owner to increase the limit.`,
      );
    }

    // Verify department belongs to college
    const department = await this.prisma.departments.findFirst({
      where: {
        id: dto.departmentId,
        collegeId,
      },
    });

    if (!department) {
      throw new BadRequestException('Invalid department');
    }

    // Verify permission set belongs to college
    const permissionSet = await this.prisma.faculty_permissions.findFirst({
      where: {
        id: dto.permissionSetId,
        collegeId,
      },
    });

    if (!permissionSet) {
      throw new BadRequestException('Invalid permission set');
    }

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user and assignment in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.users.create({
        data: {
          id: uuidv4(),
          email: dto.email,
          fullName: dto.fullName,
          passwordHash: hashedPassword,
          role: 'FACULTY',
          status: 'ACTIVE',
          collegeId,
          updatedAt: new Date(),
        },
      });

      // Create faculty assignment
      await tx.faculty_assignments.create({
        data: {
          userId: user.id,
          departmentId: dto.departmentId,
          permissionId: dto.permissionSetId,
          subjects: [],
          status: 'ACTIVE',
        },
      });

      return user;
    });

    // Log the action
    await this.auditLogService.log(
      createdById,
      'USER_CREATED',
      'USER',
      result.id,
      {
        email: dto.email,
        role: 'FACULTY',
        departmentId: dto.departmentId,
      },
    );

    // Send credentials email
    try {
      await this.emailService.sendCredentialEmail({
        to: dto.email,
        fullName: dto.fullName,
        email: dto.email,
        tempPassword,
        role: 'FACULTY',
        collegeName: college?.name,
      });
    } catch (error) {
      // Log but don't fail the creation
      console.error('Failed to send email:', error);
    }

    return {
      user: {
        id: result.id,
        fullName: result.fullName,
        email: result.email,
        role: result.role,
        status: result.status,
      },
      tempPassword,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Bulk upload faculty from CSV buffer
   * CSV format: fullName,email,departmentCode,permissionSetName
   */
  /** Parse a CSV line handling quoted fields correctly */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  /** Normalise a CSV header: lowercase, strip spaces/underscores/asterisks */
  private normaliseHeader(h: string): string {
    return h.toLowerCase().replace(/[\s_*]+/g, '');
  }

  async bulkUploadFromCSV(buffer: Buffer, filename: string, createdById: string, collegeId: string) {
    // Handle xlsx/xls — convert to CSV string via XLSX library
    let csvContent: string;
    const lname = (filename || '').toLowerCase();
    if (lname.endsWith('.xlsx') || lname.endsWith('.xls')) {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      csvContent = XLSX.utils.sheet_to_csv(ws);
    } else {
      // Strip BOM (Excel often prepends \uFEFF to CSV files)
      csvContent = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    }
    // Normalise line endings
    csvContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const allLines = csvContent.split('\n').filter(line => line.trim());

    if (allLines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    // Scan up to the first 5 rows to find the header row (contains "fullname" and "email")
    // This handles templates where row 0 is an instruction/note row
    const requiredColumns = ['fullname', 'email', 'departmentcode', 'permissionsetname'];
    let headerRowIndex = -1;
    let header: string[] = [];
    for (let i = 0; i < Math.min(5, allLines.length); i++) {
      const parsed = this.parseCSVLine(allLines[i]).map(h => this.normaliseHeader(h));
      if (parsed.includes('fullname') && parsed.includes('email')) {
        headerRowIndex = i;
        header = parsed;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new BadRequestException(
        `Could not find header row. Make sure your file has a row with columns: fullName, email, departmentCode, permissionSetName`
      );
    }

    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        throw new BadRequestException(
          `Missing required column: "${col}". ` +
          `Make sure your file has columns: fullName, email, departmentCode, permissionSetName`
        );
      }
    }

    // Data rows start after the header row
    const lines = [allLines[headerRowIndex], ...allLines.slice(headerRowIndex + 1)];

    const getIndex = (name: string) => header.indexOf(this.normaliseHeader(name));

    // Prefetch departments and permissions for this college
    const [departments, permissions, college] = await Promise.all([
      this.prisma.departments.findMany({
        where: { collegeId },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.faculty_permissions.findMany({
        where: { collegeId },
        select: { id: true, name: true },
      }),
      this.prisma.colleges.findUnique({
        where: { id: collegeId },
        select: { name: true },
      }),
    ]);

    const deptMap = new Map(departments.map(d => [d.code.toLowerCase(), d]));
    const permMap = new Map(permissions.map(p => [p.name.toLowerCase(), p]));

    const result = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; email: string; error: string }[],
      createdFaculty: [] as { fullName: string; email: string; tempPassword: string }[],
      emailsSent: 0,
      emailsFailed: 0,
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const rowNum = i + 1;

      try {
        const fullName = values[getIndex('fullname')];
        const email = values[getIndex('email')];
        const departmentCode = values[getIndex('departmentcode')];
        const permissionSetName = values[getIndex('permissionsetname')];

        // Validate
        if (!fullName || !email) {
          throw new Error('Missing fullName or email');
        }

        if (!email.includes('@')) {
          throw new Error('Invalid email format');
        }

        // Find department
        const dept = deptMap.get(departmentCode.toLowerCase());
        if (!dept) {
          throw new Error(`Department with code '${departmentCode}' not found`);
        }

        // Find permission set
        const perm = permMap.get(permissionSetName.toLowerCase());
        if (!perm) {
          throw new Error(`Permission set '${permissionSetName}' not found`);
        }

        // Check if email already exists
        const existingUser = await this.prisma.users.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new Error('Email already registered');
        }

        // Generate password and create faculty
        const tempPassword = this.generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        await this.prisma.$transaction(async (tx) => {
          const user = await tx.users.create({
            data: {
              id: uuidv4(),
              email,
              fullName,
              passwordHash: hashedPassword,
              role: 'FACULTY',
              status: 'ACTIVE',
              collegeId,
              updatedAt: new Date(),
            },
          });

          await tx.faculty_assignments.create({
            data: {
              userId: user.id,
              departmentId: dept.id,
              permissionId: perm.id,
              subjects: [],
              status: 'ACTIVE',
            },
          });
        });

        result.success++;
        result.createdFaculty.push({ fullName, email, tempPassword });

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
    if (result.createdFaculty.length > 0) {
      const emailResults = await this.emailService.sendBulkCredentialEmails(
        result.createdFaculty.map(f => ({
          to: f.email,
          fullName: f.fullName,
          email: f.email,
          tempPassword: f.tempPassword,
          role: 'FACULTY' as const,
          collegeName: college?.name,
        }))
      );

      result.emailsSent = emailResults.success.length;
      result.emailsFailed = emailResults.failed.length;
    }

    // Audit log
    await this.auditLogService.log(
      createdById,
      'USER_CREATED',
      'USER',
      'bulk-upload',
      {
        action: 'BULK_FACULTY_UPLOAD',
        success: result.success,
        failed: result.failed,
      },
    );

    return result;
  }

  /**
   * Delete a faculty user permanently
   * Removes the user account and all faculty assignments
   */
  async deleteFacultyUser(userId: string, deletedById: string, collegeId: string) {
    // First verify the faculty user exists and belongs to this college
    const user = await this.prisma.users.findFirst({
      where: {
        id: userId,
        collegeId,
        role: 'FACULTY',
      },
      include: {
        faculty_assignments: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Faculty user not found in your college`);
    }

    // Delete in transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete all faculty assignments first
      await tx.faculty_assignments.deleteMany({
        where: { userId },
      });

      // Delete the user account
      await tx.users.delete({
        where: { id: userId },
      });
    });

    // Audit log
    await this.auditLogService.log(
      deletedById,
      'USER_DELETED',
      'USER',
      userId,
      {
        email: user.email,
        role: 'FACULTY',
        fullName: user.fullName,
      },
    );

    return {
      message: 'Faculty user deleted successfully',
      deletedUser: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    };
  }

  /**
   * Reset faculty credentials — generate a new random password, update DB, send email
   */
  async resetFacultyCredentials(userId: string, resetById: string, collegeId: string) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, collegeId, role: 'FACULTY' },
      include: { colleges: { select: { name: true } } },
    });

    if (!user) {
      throw new NotFoundException(`Faculty user not found in your college`);
    }

    const newPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({ where: { id: userId }, data: { passwordHash: hashedPassword } });
      await tx.user_sessions.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
      await tx.refresh_tokens.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });
    });

    await this.auditLogService.log(resetById, 'USER_UPDATED', 'USER', userId, {
      email: user.email,
      action: 'credentials_reset',
    });

    try {
      await this.emailService.sendCredentialEmail({
        to: user.email,
        fullName: user.fullName,
        email: user.email,
        tempPassword: newPassword,
        role: 'FACULTY',
        collegeName: user.colleges?.name,
      });
    } catch (error) {
      console.error('Failed to send credentials email:', error);
    }

    return {
      message: 'Credentials reset successfully. New password sent to faculty email.',
      newPassword,
    };
  }

  async assignTaskToFaculty(
    facultyId: string,
    task: { taskType: string; title: string; description: string; dueDate?: string },
    assignedById: string,
    collegeId: string,
  ) {
    const faculty = await this.prisma.users.findFirst({
      where: { id: facultyId, collegeId, role: { in: ['FACULTY', 'COLLEGE_HOD'] } },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found in your college');
    }

    const assignedBy = await this.prisma.users.findUnique({
      where: { id: assignedById },
      select: { fullName: true, email: true },
    });

    const dueDateStr = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'No deadline set';

    const taskTypeLabel: Record<string, string> = {
      ADD_CONTENT: 'Add Content',
      CREATE_NOTIFICATION: 'Create Notification',
      REVIEW_CONTENT: 'Review Content',
      OTHER: 'General Task',
    };

    try {
      await this.emailService.sendAnnouncementEmail({
        to: faculty.email,
        recipientName: faculty.fullName,
        title: `[Task] ${task.title}`,
        message: `Task Type: ${taskTypeLabel[task.taskType] || task.taskType}\n\nDescription:\n${task.description}\n\nDue Date: ${dueDateStr}\n\nAssigned by: ${assignedBy?.fullName || 'HOD'}`,
        senderName: assignedBy?.fullName || 'HOD',
      });
    } catch (err) {
      console.error('Task assignment email failed:', err);
    }

    await this.auditLogService.log(assignedById, 'USER_UPDATED', 'USER', facultyId, {
      action: 'task_assigned',
      taskType: task.taskType,
      title: task.title,
    });

    return {
      message: `Task assigned to ${faculty.fullName}. Email notification sent.`,
      facultyName: faculty.fullName,
      facultyEmail: faculty.email,
      task,
    };
  }
}
