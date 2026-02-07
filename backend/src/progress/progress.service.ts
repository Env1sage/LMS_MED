import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitProgressDto } from './dto/submit-progress.dto';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if student can access a specific learning flow step
   * Ensures sequential access - student must complete prerequisite steps first
   */
  async checkStepAccess(userId: string, stepId: string) {
    // Get student record from userId
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    // Get the step details
    const step = await this.prisma.learning_flow_steps.findUnique({
      where: { id: stepId },
      include: {
        courses: {
          include: {
            course_assignments: {
              where: { studentId: student.id },
            },
          },
        },
      },
    });

    if (!step) {
      throw new NotFoundException('Learning step not found');
    }

    // Check if student is assigned to the course
    const isAssigned = step.courses.course_assignments.length > 0;

    if (!isAssigned) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Check if previous steps are completed (based on stepNumber)
    const previousSteps = await this.prisma.learning_flow_steps.findMany({
      where: {
        courseId: step.courseId,
        stepNumber: { lt: step.stepNumber },
      },
    });

    for (const prevStep of previousSteps) {
      const progress = await this.prisma.step_progress.findFirst({
        where: {
          studentId: student.id,
          stepId: prevStep.id,
          completionPercent: 100,
        },
      });

      if (!progress) {
        return {
          canAccess: false,
          reason: `You must complete the previous step first: Step ${prevStep.stepNumber}`,
          currentStep: step,
        };
      }
    }

    return {
      canAccess: true,
      currentStep: step,
    };
  }

  /**
   * Submit progress for a learning step
   */
  async submitProgress(userId: string, dto: SubmitProgressDto) {
    // Get student record
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    // Check access first
    const accessCheck = await this.checkStepAccess(userId, dto.learning_flow_stepsId);

    if (!accessCheck.canAccess) {
      throw new ForbiddenException(accessCheck.reason);
    }

    const step = accessCheck.currentStep;
    const courseId = step.courseId;

    // Create or update step progress
    const progress = await this.prisma.step_progress.upsert({
      where: {
        studentId_stepId: {
          studentId: student.id,
          stepId: dto.learning_flow_stepsId,
        },
      },
      update: {
        completionPercent: dto.completionPercent,
        timeSpentSeconds: dto.timeSpent || 0,
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: `progress_${student.id}_${dto.learning_flow_stepsId}_${Date.now()}`,
        studentId: student.id,
        courseId,
        stepId: dto.learning_flow_stepsId,
        completionPercent: dto.completionPercent,
        timeSpentSeconds: dto.timeSpent || 0,
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update student_progress table for dashboard
    if (dto.completionPercent >= 100) {
      // Get or create student_progress record
      const existingStudentProgress = await this.prisma.student_progress.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
      });

      const completedSteps = existingStudentProgress?.completedSteps || [];
      if (!completedSteps.includes(dto.learning_flow_stepsId)) {
        completedSteps.push(dto.learning_flow_stepsId);
      }

      // Get total steps for the course
      const totalSteps = await this.prisma.learning_flow_steps.count({
        where: { courseId },
      });

      const status = completedSteps.length === totalSteps ? 'COMPLETED' : 
                     completedSteps.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

      await this.prisma.student_progress.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
        update: {
          completedSteps,
          status: status as any,
          currentStepId: dto.learning_flow_stepsId,
          updatedAt: new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
        create: {
          id: `student_progress_${student.id}_${courseId}_${Date.now()}`,
          studentId: student.id,
          courseId,
          completedSteps,
          status: status as any,
          currentStepId: dto.learning_flow_stepsId,
          startedAt: new Date(),
          updatedAt: new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });
    } else if (dto.completionPercent > 0) {
      // Just mark as started if not complete
      await this.prisma.student_progress.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
        update: {
          currentStepId: dto.learning_flow_stepsId,
          updatedAt: new Date(),
        },
        create: {
          id: `student_progress_${student.id}_${courseId}_${Date.now()}`,
          studentId: student.id,
          courseId,
          completedSteps: [],
          status: 'IN_PROGRESS',
          currentStepId: dto.learning_flow_stepsId,
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return progress;
  }

  /**
   * Get student's progress for a course
   */
  async getCourseProgress(userId: string, courseId: string) {
    // Get student record
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    // Check if student is assigned to the course
    const assignment = await this.prisma.course_assignments.findFirst({
      where: {
        studentId: student.id,
        courseId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Get course with all learning flow steps
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        learning_flow_steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            learning_units: true,
            step_progress: {
              where: { studentId: student.id },
            },
          },
        },
        users: true, // Faculty
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Add lock status to each step
    const stepsWithLockStatus = course.learning_flow_steps.map((step, index) => {
      const isCompleted = step.step_progress?.some(p => p.completionPercent >= 100) || false;
      let isLocked = false;

      // Check if previous steps are completed
      if (index > 0) {
        const previousSteps = course.learning_flow_steps.slice(0, index);
        isLocked = !previousSteps.every(prevStep => 
          prevStep.step_progress?.some(p => p.completionPercent >= 100)
        );
      }

      return {
        ...step,
        isLocked,
        isCompleted,
        completionPercent: step.step_progress?.[0]?.completionPercent || 0,
        timeSpent: step.step_progress?.[0]?.timeSpentSeconds || 0,
      };
    });

    return {
      ...course,
      learning_flow_steps: stepsWithLockStatus,
    };
  }

  /**
   * Get all assigned courses for a student
   */
  async getStudentCourses(userId: string) {
    // First, get the student record from the userId
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    const assignments = await this.prisma.course_assignments.findMany({
      where: {
        studentId: student.id, // Use student.id not userId
      },
      include: {
        courses: {
          include: {
            users: true, // Faculty
            learning_flow_steps: {
              orderBy: { stepNumber: 'asc' },
              include: {
                learning_units: true,
                step_progress: {
                  where: { studentId: student.id },
                },
              },
            },
          },
        },
      },
    });

    return assignments.map((assignment) => {
      const course = assignment.courses;
      const totalSteps = course.learning_flow_steps?.length || 0;
      const completedSteps = course.learning_flow_steps?.filter(step => 
        step.step_progress?.some((p: any) => p.completionPercent >= 100)
      ).length || 0;
      const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Find next incomplete step
      const nextStep = course.learning_flow_steps?.find(step =>
        !step.step_progress?.some((p: any) => p.completionPercent >= 100)
      );

      // Get last accessed time
      const allProgress = course.learning_flow_steps?.flatMap(step => step.step_progress || []) || [];
      const lastAccessed = allProgress.length > 0 
        ? new Date(Math.max(...allProgress.map(p => new Date(p.lastAccessedAt).getTime())))
        : null;

      const status = completedSteps === 0 ? 'NOT_STARTED' 
        : completedSteps === totalSteps ? 'COMPLETED' 
        : 'IN_PROGRESS';

      return {
        courseId: course.id,
        title: course.title,
        description: course.description,
        code: course.courseCode,
        totalSteps,
        completedSteps,
        progressPercentage,
        lastAccessedAt: lastAccessed,
        nextStepId: nextStep?.id || null,
        nextStepTitle: nextStep?.learning_units?.title || null,
        status,
      };
    });
  }
}

