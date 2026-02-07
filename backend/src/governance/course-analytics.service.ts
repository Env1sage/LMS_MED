import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getCourseAnalyticsOverview(collegeId?: string) {
    const whereClause = collegeId ? { collegeId } : {};

    // Get all courses with comprehensive data
    const courses: any[] = await this.prisma.courses.findMany({
      where: {
        ...whereClause,
        status: { not: 'ARCHIVED' },
      },
      include: {
        users: {
          select: {
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            course_assignments: true,
            learning_flow_steps: true,
            student_progress: true,
            tests: true,
          },
        },
        student_progress: {
          select: {
            status: true,
            completedAt: true,
            startedAt: true,
            completedSteps: true,
          },
        },
        tests: {
          include: {
            attempts: {
              where: {
                status: 'GRADED',
              },
              select: {
                percentageScore: true,
                totalScore: true,
                isPassed: true,
              },
            },
          },
        },
      },
    });

    // Calculate analytics for each course
    const courseAnalytics = courses.map((course) => {
      const totalStudents = course._count.student_progress;
      const completedStudents = course.student_progress.filter(
        (p: any) => p.status === 'COMPLETED',
      ).length;
      const inProgressStudents = course.student_progress.filter(
        (p: any) => p.status === 'IN_PROGRESS',
      ).length;
      const notStartedStudents = course.student_progress.filter(
        (p: any) => p.status === 'NOT_STARTED',
      ).length;

      // Calculate average completion rate
      const completionRate = totalStudents > 0
        ? (completedStudents / totalStudents) * 100
        : 0;

      // Calculate average test scores
      const allTestScores = course.tests.flatMap((test: any) =>
        test.attempts.map((attempt: any) => attempt.percentageScore || 0),
      );
      const avgTestScore = allTestScores.length > 0
        ? allTestScores.reduce((a: number, b: number) => a + b, 0) / allTestScores.length
        : 0;

      // Calculate pass rate
      const totalAttempts = course.tests.flatMap((test: any) => test.attempts).length;
      const passedAttempts = course.tests
        .flatMap((test: any) => test.attempts)
        .filter((attempt: any) => attempt.isPassed).length;
      const passRate = totalAttempts > 0
        ? (passedAttempts / totalAttempts) * 100
        : 0;

      // Calculate average progress percentage
      const avgProgressPercentage = course.student_progress.length > 0
        ? course.student_progress.reduce((sum: number, progress: any) => {
            const stepsCompleted = progress.completedSteps?.length || 0;
            const totalSteps = course._count.learning_flow_steps || 1;
            return sum + (stepsCompleted / totalSteps) * 100;
          }, 0) / course.student_progress.length
        : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        courseCode: course.courseCode,
        academicYear: course.academicYear,
        status: course.status,
        faculty: course.users.fullName,
        facultyEmail: course.users.email,
        totalStudents,
        completedStudents,
        inProgressStudents,
        notStartedStudents,
        completionRate: Math.round(completionRate * 10) / 10,
        avgTestScore: Math.round(avgTestScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        avgProgressPercentage: Math.round(avgProgressPercentage * 10) / 10,
        totalLearningUnits: course._count.learning_flow_steps,
        totalTests: course._count.tests,
        totalAssignments: course._count.course_assignments,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    });

    // Sort by performance score (combination of completion rate and test scores)
    courseAnalytics.sort((a, b) => {
      const scoreA = (a.completionRate * 0.4) + (a.avgTestScore * 0.4) + (a.passRate * 0.2);
      const scoreB = (b.completionRate * 0.4) + (b.avgTestScore * 0.4) + (b.passRate * 0.2);
      return scoreB - scoreA;
    });

    return {
      totalCourses: courses.length,
      analytics: courseAnalytics,
      summary: {
        avgCompletionRate: courseAnalytics.length > 0
          ? Math.round(
              (courseAnalytics.reduce((sum, c) => sum + c.completionRate, 0) /
                courseAnalytics.length) * 10,
            ) / 10
          : 0,
        avgTestScore: courseAnalytics.length > 0
          ? Math.round(
              (courseAnalytics.reduce((sum, c) => sum + c.avgTestScore, 0) /
                courseAnalytics.length) * 10,
            ) / 10
          : 0,
        avgPassRate: courseAnalytics.length > 0
          ? Math.round(
              (courseAnalytics.reduce((sum, c) => sum + c.passRate, 0) /
                courseAnalytics.length) * 10,
            ) / 10
          : 0,
        totalStudentsEnrolled: courseAnalytics.reduce(
          (sum, c) => sum + c.totalStudents,
          0,
        ),
      },
    };
  }

  async getCourseComparison(collegeId?: string, facultyId?: string) {
    const whereClause: any = {
      status: { not: 'ARCHIVED' },
    };
    
    if (collegeId) {
      whereClause.collegeId = collegeId;
    }
    
    if (facultyId) {
      whereClause.facultyId = facultyId;
    }

    const courses: any[] = await this.prisma.courses.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        courseCode: true,
        academicYear: true,
        student_progress: {
          select: {
            status: true,
            completedSteps: true,
          },
        },
        tests: {
          include: {
            attempts: {
              where: { status: 'GRADED' },
              select: {
                percentageScore: true,
                isPassed: true,
                timeSpentSeconds: true,
              },
            },
          },
        },
        learning_flow_steps: {
          select: {
            id: true,
          },
        },
      },
    });

    return courses.map((course) => {
      const totalSteps = course.learning_flow_steps.length;
      const totalStudents = course.student_progress.length;
      
      const avgCompletion = totalStudents > 0
        ? course.student_progress.reduce((sum: number, p: any) => {
            return sum + ((p.completedSteps?.length || 0) / (totalSteps || 1)) * 100;
          }, 0) / totalStudents
        : 0;

      const allAttempts = course.tests.flatMap((t: any) => t.attempts);
      const avgScore = allAttempts.length > 0
        ? allAttempts.reduce((sum: number, a: any) => sum + (a.percentageScore || 0), 0) / allAttempts.length
        : 0;

      const passedCount = allAttempts.filter((a: any) => a.isPassed).length;
      const passRate = allAttempts.length > 0
        ? (passedCount / allAttempts.length) * 100
        : 0;

      const avgTimeSpent = allAttempts.length > 0
        ? allAttempts.reduce((sum: number, a: any) => sum + a.timeSpentSeconds, 0) / allAttempts.length
        : 0;

      return {
        courseId: course.id,
        title: course.title,
        code: course.courseCode,
        year: course.academicYear,
        enrolledStudents: totalStudents,
        avgCompletion: Math.round(avgCompletion * 10) / 10,
        avgScore: Math.round(avgScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        avgTimeSpentMinutes: Math.round(avgTimeSpent / 60),
        totalTests: course.tests.length,
        totalLearningUnits: totalSteps,
      };
    });
  }

  async getCourseDetails(courseId: string) {
    const course: any = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        users: {
          select: {
            fullName: true,
            email: true,
          },
        },
        colleges: {
          select: {
            name: true,
            code: true,
          },
        },
        student_progress: {
          include: {
            students: {
              select: {
                fullName: true,
                currentAcademicYear: true,
              },
            },
          },
        },
        tests: {
          include: {
            attempts: {
              where: { status: 'GRADED' },
              include: {
                student: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
        learning_flow_steps: {
          include: {
            learning_units: {
              select: {
                title: true,
                type: true,
              },
            },
          },
        },
        course_competencies: {
          include: {
            competencies: {
              select: {
                code: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    const totalSteps = course.learning_flow_steps.length;
    const totalStudents = course.student_progress.length;

    // Student performance breakdown
    const studentPerformance = course.student_progress.map((progress: any) => {
      const completionPercentage = totalSteps > 0
        ? ((progress.completedSteps?.length || 0) / totalSteps) * 100
        : 0;

      return {
        studentName: progress.students.fullName,
        year: progress.students.currentAcademicYear,
        status: progress.status,
        completionPercentage: Math.round(completionPercentage * 10) / 10,
        completedSteps: progress.completedSteps?.length || 0,
        totalSteps,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      };
    });

    // Test performance details
    const testPerformance = course.tests.map((test: any) => {
      const attempts = test.attempts;
      const avgScore = attempts.length > 0
        ? attempts.reduce((sum: number, a: any) => sum + (a.percentageScore || 0), 0) / attempts.length
        : 0;
      const passedCount = attempts.filter((a: any) => a.isPassed).length;

      return {
        testId: test.id,
        testTitle: test.title,
        totalQuestions: test._count.questions,
        totalAttempts: attempts.length,
        avgScore: Math.round(avgScore * 10) / 10,
        passRate: attempts.length > 0
          ? Math.round((passedCount / attempts.length) * 1000) / 10
          : 0,
        attempts: attempts.map((a: any) => ({
          studentName: a.student.fullName,
          score: a.percentageScore,
          passed: a.isPassed,
          submittedAt: a.submittedAt,
        })),
      };
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        code: course.courseCode,
        description: course.description,
        academicYear: course.academicYear,
        status: course.status,
        faculty: course.users.fullName,
        college: course.colleges.name,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      statistics: {
        totalStudents,
        totalLearningUnits: totalSteps,
        totalTests: course.tests.length,
        totalCompetencies: course.course_competencies.length,
        completionRate: totalStudents > 0
          ? Math.round(
              (course.student_progress.filter((p: any) => p.status === 'COMPLETED').length /
                totalStudents) *
                1000,
            ) / 10
          : 0,
      },
      studentPerformance,
      testPerformance,
      learningUnits: course.learning_flow_steps.map((step: any) => ({
        stepNumber: step.stepNumber,
        title: step.learning_units.title,
        type: step.learning_units.type,
        mandatory: step.mandatory,
      })),
      competencies: course.course_competencies.map((cc: any) => ({
        code: cc.competencies.code,
        description: cc.competencies.description,
      })),
    };
  }
}
