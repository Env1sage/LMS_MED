import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { EmailService } from '../email/email.service';
import { CreateFacultyUserDto } from './dto/faculty-user.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

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
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

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

    // Get college name for email
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
      select: { name: true },
    });

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
  async bulkUploadFromCSV(buffer: Buffer, createdById: string, collegeId: string) {
    const csvContent = buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredColumns = ['fullname', 'email', 'departmentcode', 'permissionsetname'];
    
    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        throw new BadRequestException(`Missing required column: ${col}`);
      }
    }

    const getIndex = (name: string) => header.indexOf(name);

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
      const values = lines[i].split(',').map(v => v.trim());
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
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

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
}
