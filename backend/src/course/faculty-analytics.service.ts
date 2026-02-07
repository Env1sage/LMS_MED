import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentStatus, AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FacultyAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get detailed analytics for a specific course
   */
  async getCourseAnalytics(facultyId: string, courseId: string) {
    const course = await this.validateCourseOwnership(facultyId, courseId);

    const [assignments, stepProgress, learningFlowSteps] = await Promise.all([
      this.prisma.course_assignments.findMany({
        where: { courseId },
        include: {
          students: {
            select: {
              id: true,
              fullName: true,
              currentAcademicYear: true,
              userId: true,
              user: {
                select: {
                  email: true,
                },
              },
              student_departments: {
                include: {
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.step_progress.findMany({
        where: { courseId },
      }),
      this.prisma.learning_flow_steps.findMany({
        where: { courseId },
        orderBy: { stepOrder: 'asc' },
        include: {
          learning_units: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      }),
    ]);

    const totalSteps = learningFlowSteps.length;
    const totalAssigned = assignments.length;
    
    // Calculate statistics
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;

    const studentDetails = assignments.map(assignment => {
      const studentProgress = stepProgress.filter(p => p.studentId === assignment.studentId);
      const completedSteps = studentProgress.filter(p => p.completionPercent >= 100).length;
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      
      // Get time spent
      const totalTimeSpent = studentProgress.reduce((sum, p) => sum + (p.timeSpentSeconds || 0), 0);
      
      // Get last activity
      const lastActivity = studentProgress.length > 0 
        ? new Date(Math.max(...studentProgress.map(p => new Date(p.lastAccessedAt || p.updatedAt).getTime())))
        : null;

      // Determine status
      let status: string;
      if (completedSteps === 0) {
        status = 'NOT_STARTED';
        notStartedCount++;
      } else if (completedSteps === totalSteps) {
        status = 'COMPLETED';
        completedCount++;
      } else {
        status = 'IN_PROGRESS';
        inProgressCount++;
      }

      // Get primary department
      const primaryDept = assignment.students.student_departments?.[0]?.department;

      return {
        studentId: assignment.students.id,
        studentName: assignment.students.fullName,
        enrollmentNumber: assignment.students.userId.substring(0, 8),
        email: assignment.students.user?.email,
        academicYear: assignment.students.currentAcademicYear,
        departmentId: primaryDept?.id || null,
        departmentName: primaryDept?.name || 'Unassigned',
        assignedAt: assignment.assignedAt,
        startedAt: assignment.startedAt,
        completedAt: assignment.completedAt,
        dueDate: assignment.dueDate,
        status,
        progressPercent,
        completedSteps,
        totalSteps,
        totalTimeSpent,
        lastActivity,
      };
    });

    // Step-wise analytics
    const stepAnalytics = learningFlowSteps.map(step => {
      const stepProgressData = stepProgress.filter(p => p.stepId === step.id);
      const stepCompletedCount = stepProgressData.filter(p => p.completionPercent >= 100).length;
      const avgCompletionPercent = stepProgressData.length > 0
        ? Math.round(stepProgressData.reduce((sum, p) => sum + p.completionPercent, 0) / stepProgressData.length)
        : 0;
      const avgTimeSpent = stepProgressData.length > 0
        ? Math.round(stepProgressData.reduce((sum, p) => sum + (p.timeSpentSeconds || 0), 0) / stepProgressData.length)
        : 0;

      return {
        stepId: step.id,
        stepNumber: step.stepNumber,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        mandatory: step.mandatory,
        learningUnit: step.learning_units,
        totalAttempted: stepProgressData.length,
        completedCount: stepCompletedCount,
        avgCompletionPercent,
        avgTimeSpent,
        completionRate: totalAssigned > 0 ? Math.round((stepCompletedCount / totalAssigned) * 100) : 0,
      };
    });

    return {
      courseId,
      courseTitle: course.title,
      academicYear: course.academicYear,
      status: course.status,
      summary: {
        totalAssigned,
        completed: completedCount,
        inProgress: inProgressCount,
        notStarted: notStartedCount,
        completionRate: totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0,
        totalSteps,
      },
      studentDetails,
      stepAnalytics,
    };
  }

  /**
   * Get batch-wise summary for a course
   */
  async getBatchSummary(facultyId: string, courseId: string) {
    await this.validateCourseOwnership(facultyId, courseId);

    const assignments = await this.prisma.course_assignments.findMany({
      where: { courseId },
      include: {
        students: {
          select: {
            id: true,
            currentAcademicYear: true,
            student_departments: {
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const stepProgress = await this.prisma.step_progress.findMany({
      where: { courseId },
    });

    const totalSteps = await this.prisma.learning_flow_steps.count({
      where: { courseId },
    });

    // Group by department and academic year
    const batchMap = new Map<string, any>();

    for (const assignment of assignments) {
      const primaryDept = assignment.students.student_departments?.[0]?.department;
      const deptId = primaryDept?.id || 'unknown';
      const key = `${deptId}_${assignment.students.currentAcademicYear}`;
      
      if (!batchMap.has(key)) {
        batchMap.set(key, {
          departmentId: deptId,
          departmentName: primaryDept?.name || 'Unassigned',
          academicYear: assignment.students.currentAcademicYear,
          students: [],
          totalStudents: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
        });
      }

      const batch = batchMap.get(key);
      const studentProgress = stepProgress.filter(p => p.studentId === assignment.studentId);
      const completedSteps = studentProgress.filter(p => p.completionPercent >= 100).length;

      batch.totalStudents++;
      
      if (completedSteps === 0) {
        batch.notStarted++;
      } else if (completedSteps === totalSteps) {
        batch.completed++;
      } else {
        batch.inProgress++;
      }
    }

    return Array.from(batchMap.values()).map(batch => ({
      ...batch,
      completionRate: batch.totalStudents > 0 
        ? Math.round((batch.completed / batch.totalStudents) * 100) 
        : 0,
    }));
  }

  /**
   * Get MCQ performance analytics for a course - simplified version
   * MCQs are now a separate entity, not a learning unit type
   */
  async getMcqAnalytics(facultyId: string, courseId: string) {
    await this.validateCourseOwnership(facultyId, courseId);

    // Get course with college to find associated publisher packages
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get publisher IDs from college packages
    const collegePackages = await this.prisma.college_packages.findMany({
      where: { collegeId: course.collegeId },
      include: {
        package: true,
      },
    });

    const publisherIds = collegePackages
      .map(cp => cp.package?.publisherId)
      .filter((id): id is string => !!id);

    // Get MCQs from the publishers
    const mcqs = await this.prisma.mcqs.findMany({
      where: {
        publisherId: { in: publisherIds.length > 0 ? publisherIds : ['_none_'] },
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        question: true,
        subject: true,
        topic: true,
        difficultyLevel: true,
        usageCount: true,
        correctRate: true,
      },
      take: 100,
    });

    const totalAttempts = mcqs.reduce((sum, m) => sum + m.usageCount, 0);
    const avgScore = mcqs.length > 0 
      ? Math.round(mcqs.reduce((sum, m) => sum + m.correctRate, 0) / mcqs.length) 
      : 0;

    return {
      mcqs: mcqs.map(m => ({
        mcqId: m.id,
        question: m.question?.substring(0, 100),
        subject: m.subject,
        topic: m.topic,
        difficultyLevel: m.difficultyLevel,
      })),
      summary: {
        totalAttempts,
        correctAttempts: Math.round(totalAttempts * (avgScore / 100)),
        avgScore,
      },
      byDifficulty: [],
    };
  }

  /**
   * Get individual student progress details
   */
  async getStudentProgress(facultyId: string, courseId: string, studentId: string) {
    await this.validateCourseOwnership(facultyId, courseId);

    // Verify student is assigned to the course
    const assignment = await this.prisma.course_assignments.findFirst({
      where: { courseId, studentId },
      include: {
        students: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Student is not assigned to this course');
    }

    const [stepProgress, learningFlowSteps] = await Promise.all([
      this.prisma.step_progress.findMany({
        where: { courseId, studentId },
      }),
      this.prisma.learning_flow_steps.findMany({
        where: { courseId },
        orderBy: { stepOrder: 'asc' },
        include: {
          learning_units: true,
        },
      }),
    ]);

    const stepsWithProgress = learningFlowSteps.map((step, index) => {
      const progress = stepProgress.find(p => p.stepId === step.id);
      const isCompleted = progress ? progress.completionPercent >= 100 : false;
      
      // Check if locked (previous mandatory steps not completed)
      let isLocked = false;
      if (index > 0) {
        for (let i = 0; i < index; i++) {
          const prevStep = learningFlowSteps[i];
          if (prevStep.mandatory) {
            const prevProgress = stepProgress.find(p => p.stepId === prevStep.id);
            if (!prevProgress || prevProgress.completionPercent < 100) {
              isLocked = true;
              break;
            }
          }
        }
      }

      return {
        stepId: step.id,
        stepNumber: step.stepNumber,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        mandatory: step.mandatory,
        learningUnit: {
          id: step.learning_units.id,
          title: step.learning_units.title,
          type: step.learning_units.type,
          estimatedDuration: step.learning_units.estimatedDuration,
        },
        completionPercent: progress?.completionPercent || 0,
        timeSpent: progress?.timeSpentSeconds || 0,
        lastAccessed: progress?.lastAccessedAt,
        isCompleted,
        isLocked,
      };
    });

    const totalSteps = learningFlowSteps.length;
    const completedSteps = stepsWithProgress.filter(s => s.isCompleted).length;

    return {
      student: {
        id: assignment.students.id,
        fullName: assignment.students.fullName,
        enrollmentNumber: assignment.students.userId.substring(0, 8),
        email: assignment.students.user?.email,
      },
      assignment: {
        assignedAt: assignment.assignedAt,
        startedAt: assignment.startedAt,
        completedAt: assignment.completedAt,
        dueDate: assignment.dueDate,
        status: assignment.status,
      },
      progress: {
        totalSteps,
        completedSteps,
        progressPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        totalTimeSpent: stepProgress.reduce((sum, p) => sum + (p.timeSpentSeconds || 0), 0),
      },
      steps: stepsWithProgress,
    };
  }

  /**
   * Generate downloadable report data
   */
  async generateReport(facultyId: string, courseId: string, format: 'summary' | 'detailed' = 'summary') {
    const analytics = await this.getCourseAnalytics(facultyId, courseId);

    // Log report generation
    const faculty = await this.prisma.users.findUnique({ where: { id: facultyId } });
    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId: facultyId,
        collegeId: faculty?.collegeId,
        action: AuditAction.USER_UPDATED,
        entityType: 'CourseReport',
        entityId: courseId,
        description: `Generated ${format} report for course`,
        metadata: { format, courseTitle: analytics.courseTitle },
      },
    });

    if (format === 'summary') {
      return {
        reportType: 'summary',
        generatedAt: new Date().toISOString(),
        course: {
          id: courseId,
          title: analytics.courseTitle,
          academicYear: analytics.academicYear,
          status: analytics.status,
        },
        summary: analytics.summary,
        batchSummary: await this.getBatchSummary(facultyId, courseId),
      };
    }

    // Detailed report
    return {
      reportType: 'detailed',
      generatedAt: new Date().toISOString(),
      course: {
        id: courseId,
        title: analytics.courseTitle,
        academicYear: analytics.academicYear,
        status: analytics.status,
      },
      summary: analytics.summary,
      studentDetails: analytics.studentDetails,
      stepAnalytics: analytics.stepAnalytics,
    };
  }

  /**
   * Get faculty dashboard overview
   */
  async getDashboardOverview(facultyId: string) {
    // Get all courses for faculty
    const courses = await this.prisma.courses.findMany({
      where: { facultyId },
      include: {
        _count: {
          select: {
            course_assignments: true,
            learning_flow_steps: true,
          },
        },
      },
    });

    const courseIds = courses.map(c => c.id);

    // Get all assignments
    const [assignments, progress] = await Promise.all([
      this.prisma.course_assignments.findMany({
        where: { courseId: { in: courseIds } },
      }),
      this.prisma.step_progress.findMany({
        where: { courseId: { in: courseIds } },
      }),
    ]);

    // Calculate overview stats
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'PUBLISHED').length;
    const draftCourses = courses.filter(c => c.status === 'DRAFT').length;
    const totalAssignments = assignments.length;
    const uniqueStudents = new Set(assignments.map(a => a.studentId)).size;

    // Get step counts per course for accurate progress calculation
    const stepCounts = await this.prisma.learning_flow_steps.groupBy({
      by: ['courseId'],
      _count: { id: true },
      where: { courseId: { in: courseIds } },
    });
    const stepCountMap = new Map(stepCounts.map(s => [s.courseId, s._count.id]));

    // Calculate completion based on actual progress (students who completed all steps)
    let completedAssignments = 0;
    let inProgressAssignments = 0;
    let notStartedAssignments = 0;
    let totalProgressPercent = 0;

    for (const assignment of assignments) {
      const courseSteps = stepCountMap.get(assignment.courseId) || 0;
      const studentProgress = progress.filter(
        p => p.studentId === assignment.studentId && p.courseId === assignment.courseId
      );
      const completedSteps = studentProgress.filter(p => p.completionPercent >= 100).length;
      const progressPercent = courseSteps > 0 ? Math.round((completedSteps / courseSteps) * 100) : 0;
      totalProgressPercent += progressPercent;

      if (completedSteps === 0) {
        notStartedAssignments++;
      } else if (completedSteps >= courseSteps && courseSteps > 0) {
        completedAssignments++;
      } else {
        inProgressAssignments++;
      }
    }

    // Calculate average progress across all students
    const averageProgress = totalAssignments > 0 
      ? Math.round(totalProgressPercent / totalAssignments) 
      : 0;

    // Completion rate is percentage of assignments that are fully completed
    const overallCompletionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;

    // Recent activity - last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentProgress = progress.filter(p => 
      p.lastAccessedAt && new Date(p.lastAccessedAt) >= sevenDaysAgo
    );
    const activeStudentsLast7Days = new Set(recentProgress.map(p => p.studentId)).size;

    // Calculate per-course analytics for the courses list
    const coursesWithAnalytics = await Promise.all(courses.map(async (course) => {
      const courseAssignments = assignments.filter(a => a.courseId === course.id);
      const courseProgress = progress.filter(p => p.courseId === course.id);
      const courseSteps = stepCountMap.get(course.id) || 0;

      // Calculate completion and scores for this course
      let completedCount = 0;
      let totalCompletionPercent = 0;
      let totalScore = 0;
      let studentsWithScores = 0;

      for (const assignment of courseAssignments) {
        const studentProgress = courseProgress.filter(p => p.studentId === assignment.studentId);
        const completedSteps = studentProgress.filter(p => p.completionPercent >= 100).length;
        const progressPercent = courseSteps > 0 ? Math.round((completedSteps / courseSteps) * 100) : 0;
        
        totalCompletionPercent += progressPercent;
        if (completedSteps >= courseSteps && courseSteps > 0) {
          completedCount++;
        }

        // Score calculation - to be implemented when test results are available
        // For now, use completion as proxy for performance
        totalScore += progressPercent;
        studentsWithScores++;
      }

      const avgCompletion = courseAssignments.length > 0 
        ? Math.round(totalCompletionPercent / courseAssignments.length)
        : 0;
      
      const avgScore = studentsWithScores > 0
        ? Math.round(totalScore / studentsWithScores)
        : 0;

      return {
        id: course.id,
        title: course.title,
        academicYear: course.academicYear,
        status: course.status,
        assignmentCount: course._count.course_assignments,
        stepCount: course._count.learning_flow_steps,
        enrolledStudents: courseAssignments.length,
        avgCompletion,
        avgScore,
      };
    }));

    return {
      overview: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalAssignments,
        uniqueStudents,
        completedAssignments,
        inProgressAssignments,
        notStartedAssignments,
        overallCompletionRate,
        averageProgress,
        activeStudentsLast7Days,
      },
      courses: coursesWithAnalytics,
    };
  }

  /**
   * Get all students enrolled in faculty's courses with their progress
   */
  async getAllStudents(facultyId: string, filter?: 'all' | 'active' | 'assigned') {
    // Get all courses for faculty
    const courses = await this.prisma.courses.findMany({
      where: { facultyId },
      select: { id: true, title: true },
    });

    const courseIds = courses.map(c => c.id);

    // Get all assignments with student details
    const assignments = await this.prisma.course_assignments.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        students: {
          select: {
            id: true,
            fullName: true,
            currentAcademicYear: true,
            userId: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Get progress for all students
    const progress = await this.prisma.step_progress.findMany({
      where: { courseId: { in: courseIds } },
    });

    // Get step counts per course
    const stepCounts = await this.prisma.learning_flow_steps.groupBy({
      by: ['courseId'],
      _count: { id: true },
      where: { courseId: { in: courseIds } },
    });
    const stepCountMap = new Map(stepCounts.map(s => [s.courseId, s._count.id]));

    // Calculate last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeStudentIds = new Set(
      progress
        .filter(p => p.lastAccessedAt && new Date(p.lastAccessedAt) >= sevenDaysAgo)
        .map(p => p.studentId)
    );

    // Aggregate student data
    const studentMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      academicYear: string;
      coursesEnrolled: string[];
      totalProgress: number;
      progressCount: number;
      status: string;
      isActive: boolean;
    }>();

    for (const assignment of assignments) {
      const student = assignment.students;
      const courseProgress = progress.filter(
        p => p.studentId === student.id && p.courseId === assignment.courseId
      );
      
      const totalSteps = stepCountMap.get(assignment.courseId) || 1;
      const completedSteps = courseProgress.filter(p => p.completionPercent >= 100).length;
      const courseProgressPercent = Math.round((completedSteps / totalSteps) * 100);

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          name: student.fullName || 'Unknown Student',
          email: student.user?.email || 'N/A',
          academicYear: student.currentAcademicYear || 'N/A',
          coursesEnrolled: [assignment.courses?.title || 'Unknown Course'],
          totalProgress: courseProgressPercent,
          progressCount: 1,
          status: assignment.status,
          isActive: activeStudentIds.has(student.id),
        });
      } else {
        const existing = studentMap.get(student.id)!;
        if (!existing.coursesEnrolled.includes(assignment.courses?.title || 'Unknown Course')) {
          existing.coursesEnrolled.push(assignment.courses?.title || 'Unknown Course');
        }
        existing.totalProgress += courseProgressPercent;
        existing.progressCount += 1;
        if (assignment.status === 'IN_PROGRESS' && existing.status !== 'COMPLETED') {
          existing.status = 'IN_PROGRESS';
        } else if (assignment.status === 'COMPLETED') {
          existing.status = 'COMPLETED';
        }
      }
    }

    // Convert to array with average progress
    let students = Array.from(studentMap.values()).map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      academicYear: s.academicYear,
      coursesEnrolled: s.coursesEnrolled.length,
      courseNames: s.coursesEnrolled.slice(0, 3),
      progress: Math.round(s.totalProgress / s.progressCount),
      status: s.status,
      isActive: s.isActive,
    }));

    // Apply filters
    if (filter === 'active') {
      students = students.filter(s => s.isActive);
    } else if (filter === 'assigned') {
      students = students.filter(s => s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS');
    }

    return {
      total: students.length,
      students: students.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  private async validateCourseOwnership(facultyId: string, courseId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.facultyId !== facultyId) {
      throw new ForbiddenException('You can only access analytics for your own courses');
    }

    return course;
  }
}
