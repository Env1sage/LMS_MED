import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface CompletionCriteria {
  videoMinWatchPercent?: number;
  bookMinReadDuration?: number;
  requiredScrollPercent?: number;
  mcqMinScore?: number;
}

export interface StepAccessResult {
  canAccess: boolean;
  reason?: string;
  step?: any;
  blockedByStep?: any;
}

@Injectable()
export class StepCompletionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate if a student can access a specific step
   * Enforces mandatory step completion before proceeding
   */
  async validateStepAccess(userId: string, stepId: string): Promise<StepAccessResult> {
    // Get student from user
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      return { canAccess: false, reason: 'Student record not found' };
    }

    // Get the step with course info
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
        learning_units: true,
      },
    });

    if (!step) {
      return { canAccess: false, reason: 'Learning step not found' };
    }

    // Check if student is assigned to the course
    if (step.courses.course_assignments.length === 0) {
      return { canAccess: false, reason: 'You are not enrolled in this course' };
    }

    // Check course status
    if (step.courses.status !== 'PUBLISHED') {
      return { canAccess: false, reason: 'This course is not yet available' };
    }

    // Get all previous mandatory steps
    const previousMandatorySteps = await this.prisma.learning_flow_steps.findMany({
      where: {
        courseId: step.courseId,
        stepOrder: { lt: step.stepOrder },
        mandatory: true,
      },
      orderBy: { stepOrder: 'asc' },
    });

    // Check if all previous mandatory steps are completed
    for (const prevStep of previousMandatorySteps) {
      const progress = await this.prisma.step_progress.findFirst({
        where: {
          studentId: student.id,
          stepId: prevStep.id,
        },
      });

      // Check completion based on criteria
      const isCompleted = progress && progress.completionPercent >= 100;

      if (!isCompleted) {
        // Log blocked access attempt
        await this.logBlockedAccess(student.id, stepId, prevStep.id, userId);

        return {
          canAccess: false,
          reason: `You must complete Step ${prevStep.stepNumber} first`,
          blockedByStep: {
            stepId: prevStep.id,
            stepNumber: prevStep.stepNumber,
            stepType: prevStep.stepType,
          },
        };
      }
    }

    return {
      canAccess: true,
      step: {
        id: step.id,
        stepNumber: step.stepNumber,
        stepType: step.stepType,
        mandatory: step.mandatory,
        completionCriteria: step.completionCriteria,
        learningUnit: step.learning_units,
      },
    };
  }

  /**
   * Validate completion based on step type and criteria
   */
  async validateCompletion(
    studentId: string,
    stepId: string,
    completionData: {
      watchPercent?: number;
      readDuration?: number;
      scrollPercent?: number;
      mcqScore?: number;
      attemptSubmitted?: boolean;
    },
  ): Promise<{ isComplete: boolean; completionPercent: number; reason?: string }> {
    const step = await this.prisma.learning_flow_steps.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new BadRequestException('Step not found');
    }

    const criteria = (step.completionCriteria as CompletionCriteria) || {};
    let completionPercent = 0;
    let isComplete = false;
    let reason: string | undefined;

    switch (step.stepType) {
      case 'VIDEO':
        const minWatchPercent = criteria.videoMinWatchPercent || 80;
        completionPercent = completionData.watchPercent || 0;
        isComplete = completionPercent >= minWatchPercent;
        if (!isComplete) {
          reason = `Must watch at least ${minWatchPercent}% of the video (currently ${completionPercent}%)`;
        }
        break;

      case 'BOOK':
        const minReadDuration = criteria.bookMinReadDuration || 300; // 5 minutes default
        const readDuration = completionData.readDuration || 0;
        completionPercent = Math.min(100, Math.round((readDuration / minReadDuration) * 100));
        isComplete = readDuration >= minReadDuration;
        if (!isComplete) {
          const remainingMinutes = Math.ceil((minReadDuration - readDuration) / 60);
          reason = `Must read for at least ${Math.ceil(minReadDuration / 60)} minutes (${remainingMinutes} more minutes needed)`;
        }
        break;

      case 'MCQ':
        const requiredScrollPercent = criteria.requiredScrollPercent || 90;
        completionPercent = completionData.scrollPercent || 100;
        isComplete = completionPercent >= requiredScrollPercent;
        if (!isComplete) {
          reason = `Must complete at least ${requiredScrollPercent}% of the content`;
        }
        break;

      default:
        completionPercent = 100;
        isComplete = true;
    }

    return { isComplete, completionPercent: Math.round(completionPercent), reason };
  }

  /**
   * Submit step completion with validation
   */
  async submitStepCompletion(
    userId: string,
    stepId: string,
    completionData: {
      watchPercent?: number;
      readDuration?: number;
      scrollPercent?: number;
      mcqScore?: number;
      attemptSubmitted?: boolean;
      timeSpent?: number;
    },
  ) {
    // Validate access first
    const accessResult = await this.validateStepAccess(userId, stepId);
    if (!accessResult.canAccess) {
      throw new ForbiddenException(accessResult.reason);
    }

    // Get student
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    // Validate completion
    const completionResult = await this.validateCompletion(
      student.id,
      stepId,
      completionData,
    );

    // Get step for courseId
    const step = await this.prisma.learning_flow_steps.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new BadRequestException('Step not found');
    }

    // Update or create progress
    const progress = await this.prisma.step_progress.upsert({
      where: {
        studentId_stepId: {
          studentId: student.id,
          stepId,
        },
      },
      update: {
        completionPercent: completionResult.completionPercent,
        timeSpentSeconds: {
          increment: completionData.timeSpent || 0,
        },
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: uuidv4(),
        studentId: student.id,
        courseId: step.courseId,
        stepId,
        completionPercent: completionResult.completionPercent,
        timeSpentSeconds: completionData.timeSpent || 0,
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update course assignment status if this is the first step
    await this.updateAssignmentStatus(student.id, step.courseId);

    // Log completion event
    if (completionResult.isComplete) {
      await this.prisma.audit_logs.create({
        data: {
          id: uuidv4(),
          userId,
          action: AuditAction.USER_UPDATED, // Using existing action
          entityType: 'StepProgress',
          entityId: stepId,
          description: `Completed step ${step.stepNumber} in course`,
          metadata: {
            stepType: step.stepType,
            completionPercent: completionResult.completionPercent,
          },
        },
      });
    }

    return {
      progress,
      isComplete: completionResult.isComplete,
      completionPercent: completionResult.completionPercent,
      message: completionResult.reason || (completionResult.isComplete ? 'Step completed!' : 'Progress saved'),
    };
  }

  /**
   * Get unlocked steps for a student in a course
   */
  async getUnlockedSteps(userId: string, courseId: string) {
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    const steps = await this.prisma.learning_flow_steps.findMany({
      where: { courseId },
      orderBy: { stepOrder: 'asc' },
      include: {
        learning_units: {
          select: {
            id: true,
            title: true,
            type: true,
            estimatedDuration: true,
          },
        },
        step_progress: {
          where: { studentId: student.id },
        },
      },
    });

    const result = [];
    let previousMandatoryCompleted = true;

    for (const step of steps) {
      const progress = step.step_progress[0];
      const isCompleted = progress && progress.completionPercent >= 100;
      const isLocked = step.mandatory && !previousMandatoryCompleted;

      result.push({
        stepId: step.id,
        stepNumber: step.stepNumber,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        mandatory: step.mandatory,
        learningUnit: step.learning_units,
        isLocked,
        isCompleted,
        completionPercent: progress?.completionPercent || 0,
        timeSpent: progress?.timeSpentSeconds || 0,
        lastAccessed: progress?.lastAccessedAt,
      });

      // Update flag for next iteration
      if (step.mandatory && !isCompleted) {
        previousMandatoryCompleted = false;
      }
    }

    return result;
  }

  /**
   * Log blocked access attempt for security
   */
  private async logBlockedAccess(
    studentId: string,
    attemptedStepId: string,
    blockedByStepId: string,
    userId: string,
  ) {
    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId,
        action: AuditAction.USER_UPDATED, // Using existing action
        entityType: 'BlockedAccess',
        entityId: attemptedStepId,
        description: 'Attempted to access locked step',
        metadata: {
          studentId,
          attemptedStepId,
          blockedByStepId,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Update course assignment status based on progress
   */
  private async updateAssignmentStatus(studentId: string, courseId: string) {
    const [totalSteps, completedSteps] = await Promise.all([
      this.prisma.learning_flow_steps.count({ where: { courseId } }),
      this.prisma.step_progress.count({
        where: {
          studentId,
          courseId,
          completionPercent: 100,
        },
      }),
    ]);

    const assignment = await this.prisma.course_assignments.findFirst({
      where: { studentId, courseId },
    });

    if (!assignment) return;

    let newStatus = assignment.status;
    const now = new Date();

    if (completedSteps === 0 && assignment.status === 'ASSIGNED') {
      newStatus = 'IN_PROGRESS';
    } else if (completedSteps === totalSteps && totalSteps > 0) {
      newStatus = 'COMPLETED';
    } else if (completedSteps > 0) {
      newStatus = 'IN_PROGRESS';
    }

    if (newStatus !== assignment.status) {
      await this.prisma.course_assignments.update({
        where: { id: assignment.id },
        data: {
          status: newStatus,
          startedAt: completedSteps > 0 && !assignment.startedAt ? now : assignment.startedAt,
          completedAt: newStatus === 'COMPLETED' ? now : null,
        },
      });
    }
  }
}
