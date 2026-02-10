import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FacultyAssignmentMgmtService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /** Create a new teacher assignment linked to a course */
  async createAssignment(facultyId: string, collegeId: string, dto: any) {
    // Verify course belongs to this teacher
    const course = await this.prisma.courses.findFirst({
      where: { id: dto.courseId, facultyId },
    });
    if (!course) throw new BadRequestException('Course not found or you do not own this course');

    // If selfPacedResourceId is provided, verify ownership
    if (dto.selfPacedResourceId) {
      const resource = await this.prisma.self_paced_resources.findFirst({
        where: { id: dto.selfPacedResourceId, facultyId },
      });
      if (!resource) throw new BadRequestException('Self-paced resource not found');
    }

    const assignment = await this.prisma.tests.create({
      data: {
        id: uuidv4(),
        courseId: dto.courseId,
        createdBy: facultyId,
        collegeId,
        title: dto.title,
        description: dto.description || null,
        type: 'ASSIGNMENT',
        status: 'ACTIVE',
        subject: dto.subject || course.title,
        totalQuestions: dto.totalQuestions || 0,
        totalMarks: dto.totalMarks || 100,
        passingMarks: dto.passingMarks || 40,
        durationMinutes: dto.durationMinutes || 0,
        scheduledStartTime: dto.startDate ? new Date(dto.startDate) : null,
        scheduledEndTime: dto.dueDate ? new Date(dto.dueDate) : null,
        allowMultipleAttempts: dto.allowMultipleAttempts || false,
        maxAttempts: dto.maxAttempts || 1,
        shuffleQuestions: false,
        showAnswersAfter: dto.showAnswersAfter ?? true,
        showExplanations: dto.showExplanations ?? true,
        negativeMarking: false,
        negativeMarkValue: 0,
      },
    });

    // If students are provided, assign them
    if (dto.studentIds && dto.studentIds.length > 0) {
      await this.assignToStudents(facultyId, assignment.id, { studentIds: dto.studentIds, dueDate: dto.dueDate });
    }

    return assignment;
  }

  /** Get all assignments created by this teacher */
  async getMyAssignments(facultyId: string, filters: { courseId?: string; status?: string }) {
    const where: any = {
      createdBy: facultyId,
      type: 'ASSIGNMENT',
    };
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.status) where.status = filters.status;

    const assignments = await this.prisma.tests.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, academicYear: true } },
        assignments: {
          include: {
            student: {
              select: { id: true, fullName: true, userId: true, currentAcademicYear: true },
            },
          },
        },
        attempts: {
          select: {
            id: true, studentId: true, status: true, totalScore: true,
            percentageScore: true, isPassed: true, submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      course: a.course,
      status: a.status,
      totalMarks: a.totalMarks,
      passingMarks: a.passingMarks,
      dueDate: a.scheduledEndTime,
      startDate: a.scheduledStartTime,
      createdAt: a.createdAt,
      totalStudents: a.assignments.length,
      submittedCount: a.attempts.filter(att => att.status === 'SUBMITTED' || att.status === 'GRADED').length,
      gradedCount: a.attempts.filter(att => att.status === 'GRADED').length,
      students: a.assignments.map(sa => {
        const attempt = a.attempts.find(att => att.studentId === sa.studentId);
        return {
          studentId: sa.studentId,
          name: sa.student.fullName,
          academicYear: sa.student.currentAcademicYear,
          assignedAt: sa.assignedAt,
          dueDate: sa.dueDate,
          status: attempt?.status || sa.status,
          score: attempt?.totalScore ?? null,
          percentageScore: attempt?.percentageScore ?? null,
          isPassed: attempt?.isPassed ?? null,
          submittedAt: attempt?.submittedAt ?? null,
        };
      }),
    }));
  }

  /** Get a single assignment with full details */
  async getAssignment(facultyId: string, assignmentId: string) {
    const assignment = await this.prisma.tests.findFirst({
      where: { id: assignmentId, createdBy: facultyId, type: 'ASSIGNMENT' },
      include: {
        course: { select: { id: true, title: true, academicYear: true } },
        assignments: {
          include: {
            student: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
        attempts: {
          include: {
            responses: true,
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      course: assignment.course,
      status: assignment.status,
      totalMarks: assignment.totalMarks,
      passingMarks: assignment.passingMarks,
      dueDate: assignment.scheduledEndTime,
      startDate: assignment.scheduledStartTime,
      createdAt: assignment.createdAt,
      students: assignment.assignments.map(sa => {
        const attempt = assignment.attempts.find(att => att.studentId === sa.studentId);
        return {
          studentId: sa.studentId,
          name: sa.student.fullName,
          email: sa.student.user?.email,
          academicYear: sa.student.currentAcademicYear,
          assignedAt: sa.assignedAt,
          dueDate: sa.dueDate,
          status: attempt?.status || sa.status,
          score: attempt?.totalScore ?? null,
          percentageScore: attempt?.percentageScore ?? null,
          isPassed: attempt?.isPassed ?? null,
          submittedAt: attempt?.submittedAt ?? null,
          timeSpent: attempt?.timeSpentSeconds ?? null,
        };
      }),
    };
  }

  /** Update an assignment */
  async updateAssignment(facultyId: string, assignmentId: string, dto: any) {
    const existing = await this.prisma.tests.findFirst({
      where: { id: assignmentId, createdBy: facultyId, type: 'ASSIGNMENT' },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    return this.prisma.tests.update({
      where: { id: assignmentId },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        totalMarks: dto.totalMarks ?? existing.totalMarks,
        passingMarks: dto.passingMarks ?? existing.passingMarks,
        scheduledEndTime: dto.dueDate ? new Date(dto.dueDate) : existing.scheduledEndTime,
        scheduledStartTime: dto.startDate ? new Date(dto.startDate) : existing.scheduledStartTime,
        status: dto.status ?? existing.status,
      },
    });
  }

  /** Delete an assignment */
  async deleteAssignment(facultyId: string, assignmentId: string) {
    const existing = await this.prisma.tests.findFirst({
      where: { id: assignmentId, createdBy: facultyId, type: 'ASSIGNMENT' },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    await this.prisma.tests.delete({ where: { id: assignmentId } });
    return { message: 'Assignment deleted successfully' };
  }

  /** Assign to students */
  async assignToStudents(facultyId: string, assignmentId: string, body: any) {
    const assignment = await this.prisma.tests.findFirst({
      where: { id: assignmentId, createdBy: facultyId, type: 'ASSIGNMENT' },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const { studentIds, dueDate } = body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new BadRequestException('Student IDs required');
    }

    const results = [];
    for (const studentId of studentIds) {
      try {
        const record = await this.prisma.test_assignments.upsert({
          where: { testId_studentId: { testId: assignmentId, studentId } },
          create: {
            id: uuidv4(),
            testId: assignmentId,
            studentId,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: 'ASSIGNED',
          },
          update: {
            dueDate: dueDate ? new Date(dueDate) : undefined,
          },
        });
        results.push(record);
      } catch (err) {
        // Skip if student doesn't exist
        console.warn(`Failed to assign student ${studentId}:`, err.message);
      }
    }

    // Send email notifications for assignment (fire-and-forget)
    try {
      const assignedStudents = await this.prisma.students.findMany({
        where: { id: { in: studentIds } },
        include: { user: { select: { email: true } } },
      });
      const faculty = await this.prisma.users.findUnique({ where: { id: facultyId }, select: { fullName: true } });
      for (const student of assignedStudents) {
        this.emailService.sendCourseAssignmentEmail({
          to: student.user.email,
          studentName: student.fullName,
          courseTitle: `Assignment: ${assignment.title}`,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          facultyName: faculty?.fullName || 'Your Instructor',
        }).catch(err => console.warn('Email send failed:', err.message));
      }
    } catch (emailErr) {
      console.warn('Failed to send assignment emails:', emailErr);
    }

    // Create notification for the assignment
    try {
      await this.prisma.notifications.create({
        data: {
          id: uuidv4(),
          collegeId: assignment.collegeId,
          createdBy: facultyId,
          title: `New Assignment: ${assignment.title}`,
          message: `You have a new assignment "${assignment.title}"${dueDate ? ` due on ${new Date(dueDate).toLocaleDateString()}` : ''}`,
          type: 'ACADEMIC_NOTICE',
          priority: 'HIGH',
          audience: 'STUDENTS',
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create notification:', notifErr);
    }

    return { assigned: results.length, total: studentIds.length };
  }

  /** Grade a student submission */
  async gradeSubmission(facultyId: string, assignmentId: string, studentId: string, body: { score: number; feedback?: string }) {
    const assignment = await this.prisma.tests.findFirst({
      where: { id: assignmentId, createdBy: facultyId, type: 'ASSIGNMENT' },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Find or create attempt
    let attempt = await this.prisma.test_attempts.findFirst({
      where: { testId: assignmentId, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    if (!attempt) {
      attempt = await this.prisma.test_attempts.create({
        data: {
          id: uuidv4(),
          testId: assignmentId,
          studentId,
          attemptNumber: 1,
          status: 'SUBMITTED',
          totalScore: body.score,
          percentageScore: (body.score / assignment.totalMarks) * 100,
          isPassed: body.score >= (assignment.passingMarks || 0),
          submittedAt: new Date(),
        },
      });
    }

    const updated = await this.prisma.test_attempts.update({
      where: { id: attempt.id },
      data: {
        status: 'GRADED',
        totalScore: body.score,
        percentageScore: (body.score / assignment.totalMarks) * 100,
        isPassed: body.score >= (assignment.passingMarks || 0),
        metadata: body.feedback ? { feedback: body.feedback } : undefined,
      },
    });

    // Update test_assignment status
    await this.prisma.test_assignments.updateMany({
      where: { testId: assignmentId, studentId },
      data: { status: 'COMPLETED' },
    });

    // Send grade notification email (fire-and-forget)
    try {
      const student = await this.prisma.students.findUnique({
        where: { id: studentId },
        include: { user: { select: { email: true } } },
      });
      if (student) {
        this.emailService.sendTestResultEmail({
          to: student.user.email,
          studentName: student.fullName,
          testTitle: assignment.title,
          score: body.score,
          totalScore: assignment.totalMarks,
          passed: body.score >= (assignment.passingMarks || 0),
        }).catch(err => console.warn('Grade email failed:', err.message));
      }
    } catch (emailErr) {
      console.warn('Failed to send grade email:', emailErr);
    }

    return updated;
  }

  /** Get teacher's self-paced resources for attaching to assignments */
  async getTeacherResources(facultyId: string) {
    return this.prisma.self_paced_resources.findMany({
      where: { facultyId, status: 'ACTIVE' },
      select: {
        id: true, title: true, resourceType: true, subject: true,
        academicYear: true, viewCount: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
