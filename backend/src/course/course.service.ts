import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { CourseStatus, AssignmentStatus, StudentStatus, AuditAction } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(facultyId: string, dto: CreateCourseDto) {
    // Validate faculty belongs to a college
    const faculty = await this.prisma.users.findUnique({
      where: { id: facultyId },
      include: { colleges: true },
    });

    if (!faculty || !faculty.collegeId) {
      throw new ForbiddenException('Only college faculty can create courses');
    }

    // Verify all learning units exist
    const learningUnitIds = dto.learningFlowSteps.map((step: any) => step.learningUnitId);
    const learningUnits = await this.prisma.learning_units.findMany({
      where: { id: { in: learningUnitIds } },
    });

    if (learningUnits.length !== learningUnitIds.length) {
      throw new BadRequestException('One or more learning units not found');
    }

    // Create course with learning flow steps in transaction
    const course = await this.prisma.$transaction(async (tx) => {
      // Create course
      const newCourse = await tx.courses.create({
        data: {
          id: uuidv4(),
          facultyId,
          collegeId: faculty.collegeId!,
          title: dto.title,
          description: dto.description,
          academicYear: dto.academicYear,
          status: CourseStatus.DRAFT,
          updatedAt: new Date(),
        },
      });

      // Create learning flow steps
      await tx.learning_flow_steps.createMany({
        data: dto.learningFlowSteps.map((step: any, index: number) => ({
          id: uuidv4(),
          courseId: newCourse.id,
          learningUnitId: step.learningUnitId,
          stepOrder: step.stepOrder,
          stepNumber: index + 1,
          stepType: step.stepType,
          mandatory: step.mandatory,
          completionCriteria: step.completionCriteria || {},
          updatedAt: new Date(),
        })),
      });

      // Create competency associations if provided
      if (dto.competencyIds && dto.competencyIds.length > 0) {
        await tx.course_competencies.createMany({
          data: dto.competencyIds.map(competencyId => ({
            id: uuidv4(),
            courseId: newCourse.id,
            competencyId,
          })),
        });
      }

      // Audit log
      await tx.audit_logs.create({
        data: {
          id: uuidv4(),
          userId: facultyId,
          collegeId: faculty.collegeId!,
          action: AuditAction.COURSE_CREATED,
          entityType: 'Course',
          entityId: newCourse.id,
          metadata: {
            title: dto.title,
            academicYear: dto.academicYear,
            stepsCount: dto.learningFlowSteps.length,
          },
        },
      });

      return newCourse;
    });

    return this.findOne(course.id);
  }

  async findAll(facultyId: string, query: QueryCourseDto) {
    const { page = 1, limit = 10, status, academicYear, search } = query;
    const skip = (page - 1) * limit;

    // Verify faculty and get college
    const faculty = await this.prisma.users.findUnique({
      where: { id: facultyId },
    });

    if (!faculty || !faculty.collegeId) {
      throw new ForbiddenException('Only college faculty can access courses');
    }

    const where: any = {
      collegeId: faculty.collegeId,
      facultyId, // Faculty can only see their own courses
    };

    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.courses.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          learning_flow_steps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              learning_units: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  subject: true,
                  topic: true,
                },
              },
            },
          },
          course_competencies: {
            include: {
              competencies: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courses.count({ where }),
    ]);

    return {
      data: courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(courseId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        colleges: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        learning_flow_steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            learning_units: true,
          },
        },
        course_competencies: {
          include: {
            competencies: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(facultyId: string, courseId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.facultyId !== facultyId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // If course is published, only allow status and description updates
    if (course.status === CourseStatus.PUBLISHED && dto.learningFlowSteps) {
      throw new ForbiddenException('Cannot modify learning flow of published course');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update course basic info
      const updatedCourse = await tx.courses.update({
        where: { id: courseId },
        data: {
          title: dto.title,
          description: dto.description,
          academicYear: dto.academicYear,
          status: dto.status,
        },
      });

      // Update competencies if provided
      if (dto.competencyIds) {
        await tx.course_competencies.deleteMany({
          where: { courseId },
        });
        if (dto.competencyIds.length > 0) {
          await tx.course_competencies.createMany({
            data: dto.competencyIds.map(competencyId => ({
              id: uuidv4(),
              courseId,
              competencyId,
            })),
          });
        }
      }

      // Update learning flow steps if provided and course is not published
      if (dto.learningFlowSteps && course.status !== CourseStatus.PUBLISHED) {
        await tx.learning_flow_steps.deleteMany({
          where: { courseId },
        });
        await tx.learning_flow_steps.createMany({
          data: dto.learningFlowSteps.map((step: any, index: number) => ({
            id: uuidv4(),
            courseId,
            learningUnitId: step.learningUnitId,
            stepOrder: step.stepOrder,
            stepNumber: index + 1,
            stepType: step.stepType,
            mandatory: step.mandatory,
            completionCriteria: step.completionCriteria || {},
            updatedAt: new Date(),
          })),
        });
      }

      // Audit log
      await tx.audit_logs.create({
        data: {
          id: uuidv4(),
          userId: facultyId,
          collegeId: course.collegeId,
          action: AuditAction.COURSE_UPDATED,
          entityType: 'Course',
          entityId: courseId,
          metadata: {
            title: dto.title,
            description: dto.description,
            academicYear: dto.academicYear,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      return updatedCourse;
    });

    return this.findOne(courseId);
  }

  async publish(facultyId: string, courseId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        learning_flow_steps: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.facultyId !== facultyId) {
      throw new ForbiddenException('You can only publish your own courses');
    }

    if (course.learning_flow_steps.length === 0) {
      throw new BadRequestException('Cannot publish course without learning flow steps');
    }

    const updated = await this.prisma.courses.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED },
    });

    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId: facultyId,
        collegeId: course.collegeId,
        action: AuditAction.COURSE_PUBLISHED,
        entityType: 'Course',
        entityId: courseId,
        metadata: { title: course.title },
      },
    });

    return updated;
  }

  async delete(facultyId: string, courseId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.facultyId !== facultyId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    const assignmentCount = await this.prisma.course_assignments.count({
      where: { courseId },
    });

    if (assignmentCount > 0) {
      throw new BadRequestException('Cannot delete course with active assignments');
    }

    await this.prisma.courses.delete({
      where: { id: courseId },
    });

    return { message: 'Course deleted successfully' };
  }

  async assignCourse(facultyId: string, dto: AssignCourseDto) {
    const course = await this.prisma.courses.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.facultyId !== facultyId) {
      throw new ForbiddenException('You can only assign your own courses');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Can only assign published courses');
    }

    // Validate students
    const students = await this.prisma.students.findMany({
      where: {
        id: { in: dto.studentIds },
        collegeId: course.collegeId,
        status: StudentStatus.ACTIVE,
      },
    });

    if (students.length !== dto.studentIds.length) {
      throw new BadRequestException('One or more students not found or inactive');
    }

    // Check academic year eligibility
    const invalidStudents = students.filter(
      student => student.currentAcademicYear !== course.academicYear
    );

    if (invalidStudents.length > 0) {
      throw new BadRequestException(
        `Course academic year mismatch for ${invalidStudents.length} student(s)`
      );
    }

    // Create assignments
    const assignments = await this.prisma.$transaction(
      dto.studentIds.map(studentId =>
        this.prisma.course_assignments.upsert({
          where: {
            courseId_studentId: {
              courseId: dto.courseId,
              studentId,
            },
          },
          create: {
            id: uuidv4(),
            courseId: dto.courseId,
            studentId,
            assignedBy: facultyId,
            assignmentType: dto.assignmentType,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            status: AssignmentStatus.ASSIGNED,
          },
          update: {
            assignedBy: facultyId,
            assignmentType: dto.assignmentType,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            status: AssignmentStatus.ASSIGNED,
          },
        })
      )
    );

    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId: facultyId,
        collegeId: course.collegeId,
        action: AuditAction.COURSE_ASSIGNED,
        entityType: 'CourseAssignment',
        entityId: dto.courseId,
        metadata: {
          studentCount: dto.studentIds.length,
          assignmentType: dto.assignmentType,
        },
      },
    });

    return {
      message: `Course assigned to ${assignments.length} student(s)`,
      assignments,
    };
  }

  async getCourseAnalytics(facultyId: string, courseId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        learning_flow_steps: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.facultyId !== facultyId) {
      throw new ForbiddenException('You can only view analytics for your own courses');
    }

    const [assignments, progress] = await Promise.all([
      this.prisma.course_assignments.findMany({
        where: { courseId },
        include: {
          students: {
            select: {
              id: true,
              fullName: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.student_progress.findMany({
        where: { courseId },
      }),
    ]);

    const totalAssigned = assignments.length;
    const completed = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
    const inProgress = assignments.filter(a => a.status === AssignmentStatus.IN_PROGRESS).length;
    const notStarted = totalAssigned - completed - inProgress;

    const totalSteps = course.learning_flow_steps.length;

    return {
      totalAssigned,
      completed,
      inProgress,
      notStarted,
      completionRate: totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0,
      studentDetails: assignments.map(assignment => {
        const studentProgress = progress.filter(p => p.studentId === assignment.studentId);
        const completedSteps = studentProgress.filter(p => p.status === 'COMPLETED').length;

        return {
          studentId: assignment.students.id,
          studentName: assignment.students.fullName,
          email: assignment.students.user.email,
          assignedAt: assignment.assignedAt,
          startedAt: assignment.startedAt,
          completedAt: assignment.completedAt,
          status: assignment.status,
          progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
        };
      }),
    };
  }
}
