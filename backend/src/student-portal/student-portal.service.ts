import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestStatus, AttemptStatus, TestType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentPortalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get student dashboard data with today's agenda
   */
  async getDashboard(userId: string) {
    // Get student profile
    const student = await this.prisma.students.findFirst({
      where: { userId },
      include: {
        college: { select: { id: true, name: true, code: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get assigned courses with progress
    const courseAssignments = await this.prisma.course_assignments.findMany({
      where: { studentId: student.id, status: { not: 'COMPLETED' } },
      include: {
        courses: {
          include: {
            learning_flow_steps: true,
            users: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    // Get student progress for each course
    const courseProgress = await this.prisma.student_progress.findMany({
      where: { studentId: student.id },
    });

    // Get upcoming tests (next 7 days)
    const upcomingTests = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: {
          status: { in: [TestStatus.SCHEDULED, TestStatus.ACTIVE] },
          scheduledStartTime: { lte: weekFromNow },
        },
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            subject: true,
            type: true,
            status: true,
            durationMinutes: true,
            totalMarks: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
      orderBy: { test: { scheduledStartTime: 'asc' } },
    });

    // Get active tests (can attempt now)
    const activeTests = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: {
          status: TestStatus.ACTIVE,
          scheduledStartTime: { lte: new Date() },
          scheduledEndTime: { gte: new Date() },
        },
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            subject: true,
            durationMinutes: true,
            totalMarks: true,
            scheduledEndTime: true,
          },
        },
      },
    });

    // Get recent notifications
    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId: student.collegeId,
        isActive: true,
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'BATCH', academicYear: student.currentAcademicYear },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get student's course ratings
    const courseIds = courseAssignments.map(ca => ca.courseId);
    const studentRatings = await this.prisma.ratings.findMany({
      where: { studentId: student.id, ratingType: 'COURSE', entityId: { in: courseIds } },
      select: { entityId: true, rating: true },
    });

    // Get unread notification count
    const readNotificationIds = await this.prisma.notification_reads.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const readIds = readNotificationIds.map(n => n.notificationId);
    const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

    // Calculate overall progress
    const coursesData = courseAssignments.map(ca => {
      const progress = courseProgress.find(p => p.courseId === ca.courseId);
      const totalSteps = ca.courses.learning_flow_steps.length;
      const completedSteps = progress?.completedSteps?.length || 0;
      const userRating = studentRatings.find(r => r.entityId === ca.courseId)?.rating || 0;
      return {
        id: ca.courseId,
        title: ca.courses.title,
        code: ca.courses.courseCode,
        facultyId: ca.courses.users.id,
        facultyName: ca.courses.users.fullName,
        totalSteps,
        completedSteps,
        progressPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        status: progress?.status || 'NOT_STARTED',
        userRating,
      };
    });

    const totalCourses = coursesData.length;
    const completedCourses = coursesData.filter(c => c.status === 'COMPLETED').length;
    const inProgressCourses = coursesData.filter(c => c.status === 'IN_PROGRESS').length;
    const overallProgress = totalCourses > 0 
      ? Math.round(coursesData.reduce((sum, c) => sum + c.progressPercent, 0) / totalCourses)
      : 0;

    // Build today's agenda as a flat array
    const todaysAgendaItems: Array<{
      type: string;
      title: string;
      time?: string;
      courseName?: string;
      testId?: string;
      deadline?: string;
    }> = [];

    // Add active tests to agenda
    activeTests.forEach(t => {
      todaysAgendaItems.push({
        type: 'TEST',
        title: t.test.title,
        time: t.test.scheduledEndTime ? new Date(t.test.scheduledEndTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
        courseName: t.test.subject || 'Assessment',
        testId: t.test.id,
      });
    });

    // Add upcoming tests for today
    upcomingTests.slice(0, 3).forEach(t => {
      todaysAgendaItems.push({
        type: 'UPCOMING_TEST',
        title: t.test.title,
        time: t.test.scheduledStartTime ? new Date(t.test.scheduledStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
        courseName: t.test.subject || 'Assessment',
        testId: t.test.id,
      });
    });

    // Calculate total study hours from step_progress
    const studyTimeResult = await this.prisma.step_progress.aggregate({
      where: { studentId: student.id },
      _sum: { timeSpentSeconds: true },
    });
    const totalStudyHours = Math.round((studyTimeResult._sum.timeSpentSeconds || 0) / 3600);

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        academicYear: student.currentAcademicYear,
        college: student.college,
      },
      progressSummary: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        overallProgress,
        averageProgress: overallProgress,
        totalStudyHours,
      },
      todaysAgenda: todaysAgendaItems,
      courses: coursesData.map(c => ({
        id: c.id,
        title: c.title,
        code: c.code,
        facultyId: c.facultyId,
        facultyName: c.facultyName,
        progress: c.progressPercent,
        totalLessons: c.totalSteps,
        completedLessons: c.completedSteps,
        status: c.status,
        userRating: c.userRating,
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        createdAt: n.createdAt,
        isRead: readIds.includes(n.id),
      })),
      unreadNotificationCount: unreadCount,
    };
  }

  /**
   * Get all tests assigned to student
   */
  async getMyTests(userId: string, filter?: { status?: string; type?: string }) {
    const student = await this.getStudentByUserId(userId);

    const whereClause: any = { studentId: student.id };
    
    if (filter?.status) {
      if (filter.status === 'upcoming') {
        whereClause.test = { status: TestStatus.SCHEDULED };
      } else if (filter.status === 'active') {
        whereClause.test = { status: TestStatus.ACTIVE };
      } else if (filter.status === 'completed') {
        whereClause.test = { status: TestStatus.COMPLETED };
      }
    }

    if (filter?.type) {
      whereClause.test = { ...whereClause.test, type: filter.type };
    }

    const assignments = await this.prisma.test_assignments.findMany({
      where: whereClause,
      include: {
        test: {
          include: {
            creator: { select: { fullName: true } },
            course: { select: { title: true, courseCode: true } },
          },
        },
      },
      orderBy: { test: { scheduledStartTime: 'desc' } },
    });

    // Get attempt info for each test
    const testIds = assignments.map(a => a.testId);
    const attempts = await this.prisma.test_attempts.findMany({
      where: { studentId: student.id, testId: { in: testIds } },
    });

    return assignments.map(a => {
      const testAttempts = attempts.filter(at => at.testId === a.testId);
      const latestAttempt = testAttempts.sort((x, y) => 
        new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
      )[0];

      return {
        id: a.test.id,
        title: a.test.title,
        description: a.test.description,
        subject: a.test.subject,
        type: a.test.type,
        status: a.test.status,
        faculty: a.test.creator.fullName,
        course: a.test.course,
        courseId: a.test.courseId,
        totalQuestions: a.test.totalQuestions,
        totalMarks: a.test.totalMarks,
        durationMinutes: a.test.durationMinutes,
        scheduledStartTime: a.test.scheduledStartTime,
        scheduledEndTime: a.test.scheduledEndTime,
        dueDate: a.dueDate,
        attemptCount: testAttempts.length,
        maxAttempts: a.test.maxAttempts,
        canAttempt: this.canAttemptTest(a.test, testAttempts),
        latestAttempt: latestAttempt ? {
          id: latestAttempt.id,
          status: latestAttempt.status,
          score: latestAttempt.totalScore,
          percentageScore: latestAttempt.percentageScore,
          submittedAt: latestAttempt.submittedAt,
        } : null,
      };
    });
  }

  /**
   * Get test details before starting
   */
  async getTestDetails(userId: string, testId: string) {
    const student = await this.getStudentByUserId(userId);

    // Check if test is assigned to student
    const assignment = await this.prisma.test_assignments.findUnique({
      where: { testId_studentId: { testId, studentId: student.id } },
      include: {
        test: {
          include: {
            creator: { select: { fullName: true } },
            course: { select: { title: true } },
          },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException('This test is not assigned to you');
    }

    const attempts = await this.prisma.test_attempts.findMany({
      where: { testId, studentId: student.id },
      orderBy: { attemptNumber: 'desc' },
    });

    return {
      id: assignment.test.id,
      title: assignment.test.title,
      description: assignment.test.description,
      subject: assignment.test.subject,
      type: assignment.test.type,
      status: assignment.test.status,
      faculty: assignment.test.creator.fullName,
      course: assignment.test.course.title,
      totalQuestions: assignment.test.totalQuestions,
      totalMarks: assignment.test.totalMarks,
      passingMarks: assignment.test.passingMarks,
      durationMinutes: assignment.test.durationMinutes,
      scheduledStartTime: assignment.test.scheduledStartTime,
      scheduledEndTime: assignment.test.scheduledEndTime,
      settings: {
        shuffleQuestions: assignment.test.shuffleQuestions,
        showAnswersAfter: assignment.test.showAnswersAfter,
        showExplanations: assignment.test.showExplanations,
        negativeMarking: assignment.test.negativeMarking,
        negativeMarkValue: assignment.test.negativeMarkValue,
        allowMultipleAttempts: assignment.test.allowMultipleAttempts,
        maxAttempts: assignment.test.maxAttempts,
      },
      attempts: attempts.map(a => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        status: a.status,
        score: a.totalScore,
        percentageScore: a.percentageScore,
        isPassed: a.isPassed,
        submittedAt: a.submittedAt,
        timeSpent: a.timeSpentSeconds,
      })),
      canAttempt: this.canAttemptTest(assignment.test, attempts),
    };
  }

  /**
   * Start a test attempt
   */
  async startTestAttempt(userId: string, testId: string, ipAddress?: string, userAgent?: string) {
    const student = await this.getStudentByUserId(userId);

    // Verify assignment
    const assignment = await this.prisma.test_assignments.findUnique({
      where: { testId_studentId: { testId, studentId: student.id } },
      include: { test: { include: { questions: true } } },
    });

    if (!assignment) {
      throw new ForbiddenException('This test is not assigned to you');
    }

    // Check if test is active
    const now = new Date();
    if (assignment.test.status !== TestStatus.ACTIVE) {
      throw new BadRequestException('This test is not currently active');
    }
    if (assignment.test.scheduledStartTime && now < assignment.test.scheduledStartTime) {
      throw new BadRequestException('This test has not started yet');
    }
    if (assignment.test.scheduledEndTime && now > assignment.test.scheduledEndTime) {
      throw new BadRequestException('This test has ended');
    }

    // Check existing attempts
    const existingAttempts = await this.prisma.test_attempts.findMany({
      where: { testId, studentId: student.id },
    });

    // Check for in-progress attempt
    const inProgressAttempt = existingAttempts.find(a => a.status === AttemptStatus.IN_PROGRESS);
    if (inProgressAttempt) {
      // Return existing attempt with questions
      return this.getAttemptWithQuestions(inProgressAttempt.id);
    }

    // Check attempt limit
    if (!assignment.test.allowMultipleAttempts && existingAttempts.length > 0) {
      throw new BadRequestException('You have already attempted this test');
    }
    if (existingAttempts.length >= assignment.test.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached');
    }

    // Create new attempt
    const attemptNumber = existingAttempts.length + 1;
    const attempt = await this.prisma.test_attempts.create({
      data: {
        id: uuidv4(),
        testId,
        studentId: student.id,
        attemptNumber,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
        ipAddress,
        userAgent,
        updatedAt: now,
      },
    });

    // Get questions (shuffle if enabled)
    let questions = assignment.test.questions;
    if (assignment.test.shuffleQuestions) {
      questions = this.shuffleArray([...questions]);
    }

    // Fetch MCQ details for each question
    const mcqIds = questions.map(q => q.mcqId);
    const mcqs = await this.prisma.mcqs.findMany({
      where: { id: { in: mcqIds } },
      select: {
        id: true,
        question: true,
        questionImage: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        optionE: true,
        subject: true,
        topic: true,
        difficultyLevel: true,
      },
    });

    const questionsWithDetails = questions.map((q, index) => {
      const mcq = mcqs.find(m => m.id === q.mcqId);
      return {
        questionOrder: index + 1,
        mcqId: q.mcqId,
        marks: q.marks,
        question: mcq?.question,
        questionImage: mcq?.questionImage,
        options: {
          A: mcq?.optionA,
          B: mcq?.optionB,
          C: mcq?.optionC,
          D: mcq?.optionD,
          E: mcq?.optionE,
        },
        subject: mcq?.subject,
        topic: mcq?.topic,
        difficulty: mcq?.difficultyLevel,
      };
    });

    return {
      attemptId: attempt.id,
      testId,
      title: assignment.test.title,
      totalQuestions: assignment.test.totalQuestions,
      totalMarks: assignment.test.totalMarks,
      durationMinutes: assignment.test.durationMinutes,
      startedAt: attempt.startedAt,
      endsAt: new Date(now.getTime() + assignment.test.durationMinutes * 60000),
      questions: questionsWithDetails,
      settings: {
        negativeMarking: assignment.test.negativeMarking,
        negativeMarkValue: assignment.test.negativeMarkValue,
      },
    };
  }

  /**
   * Save answer for a question
   */
  async saveAnswer(userId: string, attemptId: string, mcqId: string, answer: string | null, timeSpent: number) {
    const student = await this.getStudentByUserId(userId);

    const attempt = await this.prisma.test_attempts.findFirst({
      where: { id: attemptId, studentId: student.id, status: AttemptStatus.IN_PROGRESS },
    });

    if (!attempt) {
      throw new BadRequestException('Invalid or completed attempt');
    }

    // Upsert the response
    const existingResponse = await this.prisma.test_responses.findUnique({
      where: { attemptId_mcqId: { attemptId, mcqId } },
    });

    if (existingResponse) {
      await this.prisma.test_responses.update({
        where: { id: existingResponse.id },
        data: {
          selectedAnswer: answer,
          timeSpentSeconds: timeSpent,
          answeredAt: answer ? new Date() : null,
        },
      });
    } else {
      await this.prisma.test_responses.create({
        data: {
          id: uuidv4(),
          attemptId,
          mcqId,
          questionOrder: 0, // Will be set properly
          selectedAnswer: answer,
          timeSpentSeconds: timeSpent,
          answeredAt: answer ? new Date() : null,
        },
      });
    }

    return { saved: true };
  }

  /**
   * Submit test attempt
   */
  async submitAttempt(userId: string, attemptId: string) {
    const student = await this.getStudentByUserId(userId);

    const attempt = await this.prisma.test_attempts.findFirst({
      where: { id: attemptId, studentId: student.id },
      include: {
        test: true,
        responses: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('This attempt has already been submitted');
    }

    // Get all MCQs for grading
    const mcqIds = attempt.responses.map(r => r.mcqId);
    const mcqs = await this.prisma.mcqs.findMany({
      where: { id: { in: mcqIds } },
      select: { id: true, correctAnswer: true },
    });

    // Get question marks
    const questions = await this.prisma.test_questions.findMany({
      where: { testId: attempt.testId },
    });

    // Calculate scores
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalScore = 0;

    const responseUpdates = attempt.responses.map(response => {
      const mcq = mcqs.find(m => m.id === response.mcqId);
      const question = questions.find(q => q.mcqId === response.mcqId);
      const marks = question?.marks || 1;

      let isCorrect = false;
      let marksAwarded = 0;

      if (!response.selectedAnswer) {
        totalSkipped++;
      } else if (response.selectedAnswer === mcq?.correctAnswer) {
        isCorrect = true;
        totalCorrect++;
        marksAwarded = marks;
        totalScore += marks;
      } else {
        totalIncorrect++;
        if (attempt.test.negativeMarking) {
          marksAwarded = -attempt.test.negativeMarkValue;
          totalScore -= attempt.test.negativeMarkValue;
        }
      }

      return this.prisma.test_responses.update({
        where: { id: response.id },
        data: { isCorrect, marksAwarded },
      });
    });

    await Promise.all(responseUpdates);

    // Calculate final scores
    const percentageScore = attempt.test.totalMarks > 0 
      ? Math.round((totalScore / attempt.test.totalMarks) * 100 * 100) / 100
      : 0;
    const isPassed = attempt.test.passingMarks 
      ? totalScore >= attempt.test.passingMarks
      : percentageScore >= 40;

    const timeSpent = attempt.startedAt 
      ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    // Update attempt
    const updatedAttempt = await this.prisma.test_attempts.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        totalScore,
        totalCorrect,
        totalIncorrect,
        totalSkipped,
        percentageScore,
        isPassed,
        timeSpentSeconds: timeSpent,
        updatedAt: new Date(),
      },
    });

    // ── Auto-save assignment/test result to student_library ──
    this.autoSaveResultToLibrary(student.id, attempt.test, updatedAttempt).catch(() => {});

    return {
      attemptId: updatedAttempt.id,
      status: updatedAttempt.status,
      totalScore,
      totalMarks: attempt.test.totalMarks,
      totalCorrect,
      totalIncorrect,
      totalSkipped,
      percentageScore,
      isPassed,
      timeSpent,
      passingMarks: attempt.test.passingMarks,
    };
  }

  /**
   * Get attempt results with answers
   */
  async getAttemptResults(userId: string, attemptId: string) {
    const student = await this.getStudentByUserId(userId);

    const attempt = await this.prisma.test_attempts.findFirst({
      where: { id: attemptId, studentId: student.id },
      include: {
        test: true,
        responses: { orderBy: { questionOrder: 'asc' } },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('This attempt has not been submitted yet');
    }

    // Get MCQ details if showAnswersAfter is enabled
    let questionsWithAnswers: any[] = [];
    if (attempt.test.showAnswersAfter) {
      const mcqIds = attempt.responses.map(r => r.mcqId);
      const mcqs = await this.prisma.mcqs.findMany({
        where: { id: { in: mcqIds } },
        select: {
          id: true,
          question: true,
          questionImage: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          optionE: true,
          correctAnswer: true,
          explanation: attempt.test.showExplanations ? true : false,
          explanationImage: attempt.test.showExplanations ? true : false,
          subject: true,
          topic: true,
        },
      });

      questionsWithAnswers = attempt.responses.map(response => {
        const mcq = mcqs.find(m => m.id === response.mcqId);
        return {
          questionOrder: response.questionOrder,
          question: mcq?.question,
          questionImage: mcq?.questionImage,
          options: {
            A: mcq?.optionA,
            B: mcq?.optionB,
            C: mcq?.optionC,
            D: mcq?.optionD,
            E: mcq?.optionE,
          },
          yourAnswer: response.selectedAnswer,
          correctAnswer: mcq?.correctAnswer,
          isCorrect: response.isCorrect,
          marksAwarded: response.marksAwarded,
          explanation: attempt.test.showExplanations ? (mcq as any)?.explanation : null,
          explanationImage: attempt.test.showExplanations ? (mcq as any)?.explanationImage : null,
          subject: mcq?.subject,
          topic: mcq?.topic,
        };
      });
    }

    return {
      attemptId: attempt.id,
      testTitle: attempt.test.title,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeSpent: attempt.timeSpentSeconds,
      score: {
        total: attempt.totalScore,
        outOf: attempt.test.totalMarks,
        percentage: attempt.percentageScore,
        passingMarks: attempt.test.passingMarks,
        isPassed: attempt.isPassed,
      },
      breakdown: {
        correct: attempt.totalCorrect,
        incorrect: attempt.totalIncorrect,
        skipped: attempt.totalSkipped,
        total: attempt.test.totalQuestions,
      },
      showAnswers: attempt.test.showAnswersAfter,
      questions: questionsWithAnswers,
    };
  }

  /**
   * Get practice mode questions
   */
  async startPracticeSession(userId: string, options: { subject?: string; topic?: string; count?: number }) {
    const student = await this.getStudentByUserId(userId);
    const count = Math.min(options.count || 10, 50);

    // Get MCQs for practice (approved ones)
    const whereClause: any = { status: 'APPROVED' };
    if (options.subject) whereClause.subject = options.subject;
    if (options.topic) whereClause.topic = options.topic;

    const mcqs = await this.prisma.mcqs.findMany({
      where: whereClause,
      take: count * 2, // Get more to allow random selection
      select: {
        id: true,
        question: true,
        questionImage: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        optionE: true,
        subject: true,
        topic: true,
        difficultyLevel: true,
      },
    });

    // Shuffle and take required count
    const shuffled = this.shuffleArray([...mcqs]).slice(0, count);

    // Create practice session
    const session = await this.prisma.practice_sessions.create({
      data: {
        id: uuidv4(),
        studentId: student.id,
        subject: options.subject,
        topic: options.topic,
        totalQuestions: shuffled.length,
      },
    });

    return {
      sessionId: session.id,
      subject: options.subject,
      topic: options.topic,
      totalQuestions: shuffled.length,
      questions: shuffled.map((mcq, index) => ({
        questionNumber: index + 1,
        mcqId: mcq.id,
        question: mcq.question,
        questionImage: mcq.questionImage,
        options: {
          A: mcq.optionA,
          B: mcq.optionB,
          C: mcq.optionC,
          D: mcq.optionD,
          E: mcq.optionE,
        },
        subject: mcq.subject,
        topic: mcq.topic,
        difficulty: mcq.difficultyLevel,
      })),
    };
  }

  /**
   * Submit practice answer and get immediate feedback
   */
  async submitPracticeAnswer(userId: string, sessionId: string, mcqId: string, answer: string, timeSpent: number) {
    const student = await this.getStudentByUserId(userId);

    const session = await this.prisma.practice_sessions.findFirst({
      where: { id: sessionId, studentId: student.id },
    });

    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    // Get MCQ with correct answer
    const mcq = await this.prisma.mcqs.findUnique({
      where: { id: mcqId },
      select: {
        correctAnswer: true,
        explanation: true,
        explanationImage: true,
      },
    });

    if (!mcq) {
      throw new NotFoundException('Question not found');
    }

    const isCorrect = answer === mcq.correctAnswer;

    // Save response
    await this.prisma.practice_responses.create({
      data: {
        id: uuidv4(),
        sessionId,
        mcqId,
        selectedAnswer: answer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        answeredAt: new Date(),
      },
    });

    // Update session stats
    await this.prisma.practice_sessions.update({
      where: { id: sessionId },
      data: {
        correctAnswers: { increment: isCorrect ? 1 : 0 },
        incorrectAnswers: { increment: isCorrect ? 0 : 1 },
        timeSpentSeconds: { increment: timeSpent },
      },
    });

    return {
      isCorrect,
      correctAnswer: mcq.correctAnswer,
      explanation: mcq.explanation,
      explanationImage: mcq.explanationImage,
    };
  }

  /**
   * Complete practice session
   */
  async completePracticeSession(userId: string, sessionId: string) {
    const student = await this.getStudentByUserId(userId);

    const session = await this.prisma.practice_sessions.findFirst({
      where: { id: sessionId, studentId: student.id },
      include: { responses: true },
    });

    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    const skipped = session.totalQuestions - session.responses.length;

    const updated = await this.prisma.practice_sessions.update({
      where: { id: sessionId },
      data: {
        skippedQuestions: skipped,
        completedAt: new Date(),
      },
    });

    return {
      sessionId: updated.id,
      totalQuestions: updated.totalQuestions,
      correctAnswers: updated.correctAnswers,
      incorrectAnswers: updated.incorrectAnswers,
      skippedQuestions: updated.skippedQuestions,
      accuracy: updated.totalQuestions > 0 
        ? Math.round((updated.correctAnswers / (updated.correctAnswers + updated.incorrectAnswers)) * 100)
        : 0,
      timeSpent: updated.timeSpentSeconds,
    };
  }

  /**
   * Get student's library (assigned learning content)
   * Shows content from completed courses and teacher-assigned content
   */
  async getMyLibrary(userId: string) {
    const student = await this.getStudentByUserId(userId);

    // Get all course assignments with progress
    const assignments = await this.prisma.course_assignments.findMany({
      where: { studentId: student.id },
      include: {
        courses: {
          include: {
            learning_flow_steps: {
              include: {
                learning_units: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    type: true,
                    subject: true,
                    topic: true,
                    estimatedDuration: true,
                    thumbnailUrl: true,
                    publisherId: true,
                  },
                },
              },
              orderBy: { stepOrder: 'asc' },
            },
            users: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Get student progress for each course
    const progressRecords = await this.prisma.student_progress.findMany({
      where: { studentId: student.id },
      select: {
        courseId: true,
        status: true,
        completedSteps: true,
      },
    });

    const progressMap = new Map(
      progressRecords.map(p => [p.courseId, p])
    );

    // Group by type and source (publisher vs faculty)
    const library = {
      ebooks: [] as any[],
      videos: [] as any[],
      interactives: [] as any[],
      documents: [] as any[],
    };

    const facultyContent: any[] = [];
    const completedCourseContent: any[] = [];

    assignments.forEach(a => {
      const progress = progressMap.get(a.courseId);
      const totalSteps = a.courses.learning_flow_steps.length;
      const completedStepsCount = progress?.completedSteps?.length || 0;
      const isCompleted = progress?.status === 'COMPLETED' || (totalSteps > 0 && completedStepsCount >= totalSteps);
      const facultyName = a.courses.users?.fullName || 'Faculty';

      a.courses.learning_flow_steps.forEach(step => {
        const unit = step.learning_units;
        const isFacultyCreated = !unit.publisherId; // No publisherId means faculty created

        const item = {
          id: unit.id,
          title: unit.title,
          description: unit.description,
          subject: unit.subject,
          topic: unit.topic,
          duration: unit.estimatedDuration,
          thumbnail: unit.thumbnailUrl,
          courseTitle: a.courses.title,
          courseId: a.courseId,
          assignedBy: isFacultyCreated ? facultyName : null,
          isFacultyCreated,
          isFromCompletedCourse: isCompleted,
          createdAt: new Date().toISOString(),
        };

        const unitType = unit.type as string;

        // Faculty-created content - show immediately without publisher name
        if (isFacultyCreated) {
          facultyContent.push(item);
        }
        
        // Publisher content from completed courses
        if (!isFacultyCreated && isCompleted) {
          completedCourseContent.push(item);
        }

        // Show ALL assigned content in library (both faculty and publisher, regardless of completion)
        if (unitType === 'BOOK' || unitType === 'EBOOK') library.ebooks.push(item);
        else if (unitType === 'VIDEO') library.videos.push(item);
        else if (unitType === 'MCQ' || unitType === 'NOTES') library.interactives.push(item);
        else if (unitType === 'DOCUMENT' || unitType === 'HANDBOOK' || unitType === 'PPT') library.documents.push(item);
      });
    });

    return {
      totalItems: library.ebooks.length + library.videos.length + library.interactives.length + library.documents.length,
      ebooks: library.ebooks,
      videos: library.videos,
      interactives: library.interactives,
      documents: library.documents,
      facultyContent, // Content created by teachers
      completedCourseContent, // Content from completed courses
      summary: {
        totalFacultyContent: facultyContent.length,
        totalCompletedCourseContent: completedCourseContent.length,
        booksCount: library.ebooks.length,
        videosCount: library.videos.length,
        interactivesCount: library.interactives.length,
        documentsCount: library.documents.length,
      },
    };
  }

  /** Get ebooks accessible to the student (filtered from library) */
  async getEbooks(userId: string) {
    const library = await this.getMyLibrary(userId);
    return { books: library.ebooks || [] };
  }

  /** Get videos accessible to the student (filtered from library) */
  async getVideos(userId: string) {
    const library = await this.getMyLibrary(userId);
    return { videos: library.videos || [] };
  }

  /** Save a learning unit (ebook/video) to the student's persistent library */
  async saveItemToLibrary(userId: string, learningUnitId: string, type: string, title: string, subject?: string) {
    const student = await this.getStudentByUserId(userId);
    try {
      await this.prisma.student_library.upsert({
        where: {
          studentId_courseId_learningUnitId: {
            studentId: student.id,
            courseId: learningUnitId,
            learningUnitId,
          },
        },
        create: {
          studentId: student.id,
          entryType: 'COURSE_CONTENT',
          courseId: learningUnitId,
          learningUnitId,
          title,
          subject: subject || null,
          addedVia: 'MANUAL',
        },
        update: {},
      });
    } catch (e) { /* ignore duplicate */ }
    return { success: true };
  }

  /** Library folders — no persistent DB table; return empty list */
  async getLibraryFolders(_userId: string) {
    return { folders: [] };
  }

  /**
   * Get student's personal analytics
   */
  async getMyAnalytics(userId: string) {
    const student = await this.getStudentByUserId(userId);

    // Course progress
    const courseProgress = await this.prisma.student_progress.findMany({
      where: { studentId: student.id },
      include: {
        courses: {
          select: {
            title: true,
            courseCode: true,
            _count: { select: { learning_flow_steps: true } },
          },
        },
      },
    });

    // Test performance
    const testAttempts = await this.prisma.test_attempts.findMany({
      where: { studentId: student.id, status: AttemptStatus.SUBMITTED },
      include: {
        test: {
          select: {
            title: true,
            subject: true,
            type: true,
            totalMarks: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Total tests assigned per subject (for subjectPerformance.totalTests)
    const testAssignments = await this.prisma.test_assignments.findMany({
      where: { studentId: student.id },
      include: { test: { select: { subject: true } } },
    });
    const totalTestsBySubject: Record<string, number> = {};
    testAssignments.forEach(a => {
      const subj = a.test.subject;
      totalTestsBySubject[subj] = (totalTestsBySubject[subj] || 0) + 1;
    });

    // Practice stats
    const practiceSessions = await this.prisma.practice_sessions.findMany({
      where: { studentId: student.id, completedAt: { not: null } },
    });

    // Calculate subject-wise performance
    const subjectPerformance: Record<string, { total: number; correct: number; tests: number }> = {};
    testAttempts.forEach(attempt => {
      const subject = attempt.test.subject;
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { total: 0, correct: 0, tests: 0 };
      }
      subjectPerformance[subject].total += attempt.test.totalMarks || 0;
      subjectPerformance[subject].correct += attempt.totalScore || 0;
      subjectPerformance[subject].tests++;
    });

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttempts = testAttempts.filter(a => 
      a.submittedAt && new Date(a.submittedAt) >= thirtyDaysAgo
    );

    // Calculate trends
    const weeklyScores: number[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      
      const weekAttempts = testAttempts.filter(a => 
        a.submittedAt && 
        new Date(a.submittedAt) >= weekStart && 
        new Date(a.submittedAt) < weekEnd
      );
      
      const avgScore = weekAttempts.length > 0
        ? weekAttempts.reduce((sum, a) => sum + (a.percentageScore || 0), 0) / weekAttempts.length
        : 0;
      weeklyScores.unshift(Math.round(avgScore));
    }

    return {
      overview: {
        totalCourses: courseProgress.length,
        completedCourses: courseProgress.filter(p => p.status === 'COMPLETED').length,
        testsAttempted: testAttempts.length,
        testsPassed: testAttempts.filter(a => a.isPassed).length,
        averageScore: testAttempts.length > 0
          ? Math.round(testAttempts.reduce((sum, a) => sum + (a.percentageScore || 0), 0) / testAttempts.length)
          : 0,
        practiceQuestions: practiceSessions.reduce((sum, s) => sum + s.totalQuestions, 0),
      },
      courseProgress: courseProgress.map(p => ({
        courseId: p.courseId,
        title: p.courses.title,
        code: p.courses.courseCode,
        status: p.status,
        completedSteps: p.completedSteps?.length || 0,
        totalSteps: p.courses._count.learning_flow_steps,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
      })),
      subjectPerformance: Object.entries(subjectPerformance).map(([subject, data]) => ({
        subject,
        averageScore: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        testsAttempted: data.tests,
        totalTests: totalTestsBySubject[subject] || data.tests,
      })),
      recentTests: recentAttempts.slice(0, 10).map(a => ({
        id: a.id,
        title: a.test.title,
        courseName: a.test.course?.title || '',
        score: a.totalScore,
        totalMarks: a.test.totalMarks,
        completedAt: a.submittedAt,
        passed: a.isPassed,
      })),
      trends: {
        weeklyScores,
        isImproving: weeklyScores.length >= 2 && weeklyScores[weeklyScores.length - 1] > weeklyScores[0],
      },
      practiceStats: {
        totalSessions: practiceSessions.length,
        totalQuestions: practiceSessions.reduce((sum, s) => sum + s.totalQuestions, 0),
        correctAnswers: practiceSessions.reduce((sum, s) => sum + s.correctAnswers, 0),
        accuracy: practiceSessions.length > 0
          ? Math.round(
              (practiceSessions.reduce((sum, s) => sum + s.correctAnswers, 0) /
                practiceSessions.reduce((sum, s) => sum + s.totalQuestions, 0)) * 100
            )
          : 0,
        totalTimeSpent: practiceSessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0),
      },
    };
  }

  /**
   * Get timetable/schedule
   */
  async getMySchedule(userId: string, startDate?: Date, endDate?: Date) {
    const student = await this.getStudentByUserId(userId);

    const start = startDate || new Date();
    const end = endDate || new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Get schedule events
    const events = await this.prisma.schedule_events.findMany({
      where: {
        collegeId: student.collegeId,
        OR: [
          { studentId: null }, // College-wide events
          { studentId: student.id }, // Student-specific events
        ],
        startTime: { gte: start, lte: end },
      },
      orderBy: { startTime: 'asc' },
    });

    // Get upcoming test deadlines
    const testDeadlines = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: {
          scheduledEndTime: { gte: start, lte: end },
        },
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            subject: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
    });

    // Combine and format
    const schedule = [
      ...events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.eventType,
        startTime: e.startTime,
        endTime: e.endTime,
        location: e.location,
        isRecurring: e.isRecurring,
      })),
      ...testDeadlines.map(t => ({
        id: `test-${t.testId}`,
        title: `Test: ${t.test.title}`,
        description: `Subject: ${t.test.subject}`,
        type: 'TEST',
        startTime: t.test.scheduledStartTime,
        endTime: t.test.scheduledEndTime,
        location: null,
        isRecurring: false,
        testId: t.testId,
      })),
    ].sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

    return { schedule };
  }

  /**
   * Get comprehensive weekly calendar with all events, assignments, deadlines, notifications
   */
  async getWeekCalendar(userId: string, targetDate: Date) {
    const student = await this.getStudentByUserId(userId);
    
    // Calculate week boundaries (Monday to Sunday)
    const date = new Date(targetDate);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);

    // 1. Schedule events (classes, college events)
    const scheduleEvents = await this.prisma.schedule_events.findMany({
      where: {
        collegeId: student.collegeId,
        OR: [
          { studentId: null },
          { studentId: student.id },
        ],
        startTime: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startTime: 'asc' },
    });

    // 2. Upcoming tests / assignments with deadlines
    const testAssignments = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: {
          OR: [
            { scheduledStartTime: { gte: weekStart, lt: weekEnd } },
            { scheduledEndTime: { gte: weekStart, lt: weekEnd } },
          ],
        },
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            subject: true,
            type: true,
            status: true,
            totalMarks: true,
            durationMinutes: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
            course: { select: { title: true } },
          },
        },
      },
    });

    // 3. Course assignment deadlines
    const courseAssignments = await this.prisma.course_assignments.findMany({
      where: {
        studentId: student.id,
        OR: [
          { assignedAt: { gte: weekStart, lt: weekEnd } },
          { dueDate: { gte: weekStart, lt: weekEnd } },
        ],
      },
      include: {
        courses: { select: { title: true, courseCode: true } },
      },
    });

    // 4. Recent notifications for this week
    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId: student.collegeId,
        isActive: true,
        createdAt: { gte: weekStart, lt: weekEnd },
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'BATCH', academicYear: student.currentAcademicYear },
        ],
      },
      include: {
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build unified calendar items
    const calendarItems: Array<{
      id: string;
      date: string;
      time: string | null;
      endTime: string | null;
      title: string;
      description: string | null;
      type: string;
      priority: string;
      courseName: string | null;
      actionUrl: string | null;
      testId: string | null;
      isDeadline: boolean;
    }> = [];

    // Add schedule events
    scheduleEvents.forEach(e => {
      calendarItems.push({
        id: e.id,
        date: e.startTime.toISOString().split('T')[0],
        time: e.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        endTime: e.endTime ? e.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
        title: e.title,
        description: e.description,
        type: e.eventType,
        priority: 'NORMAL',
        courseName: null,
        actionUrl: null,
        testId: null,
        isDeadline: false,
      });
    });

    // Add test events
    testAssignments.forEach(ta => {
      const t = ta.test;
      if (t.scheduledStartTime) {
        calendarItems.push({
          id: `test-${t.id}`,
          date: t.scheduledStartTime.toISOString().split('T')[0],
          time: t.scheduledStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: t.scheduledEndTime ? t.scheduledEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
          title: t.type === 'ASSIGNMENT' ? `📝 ${t.title}` : `📋 ${t.title}`,
          description: `${t.subject || ''} • ${t.totalMarks} marks • ${t.durationMinutes} mins`,
          type: t.type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'TEST',
          priority: t.status === 'ACTIVE' ? 'HIGH' : 'NORMAL',
          courseName: t.course?.title || null,
          actionUrl: `/student/assignments/${t.id}`,
          testId: t.id,
          isDeadline: false,
        });
      }
      // Add deadline marker if end time is in this week
      if (t.scheduledEndTime && t.scheduledEndTime >= weekStart && t.scheduledEndTime < weekEnd) {
        calendarItems.push({
          id: `deadline-${t.id}`,
          date: t.scheduledEndTime.toISOString().split('T')[0],
          time: t.scheduledEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: null,
          title: `⏰ Deadline: ${t.title}`,
          description: `Last date to submit`,
          type: 'DEADLINE',
          priority: 'URGENT',
          courseName: t.course?.title || null,
          actionUrl: `/student/assignments/${t.id}`,
          testId: t.id,
          isDeadline: true,
        });
      }
    });

    // Add course assignment deadlines
    courseAssignments.forEach(ca => {
      if (ca.dueDate && ca.dueDate >= weekStart && ca.dueDate < weekEnd) {
        calendarItems.push({
          id: `course-deadline-${ca.courseId}`,
          date: ca.dueDate.toISOString().split('T')[0],
          time: ca.dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: null,
          title: `📚 Course Deadline: ${ca.courses.title}`,
          description: `Complete course by this date`,
          type: 'COURSE_DEADLINE',
          priority: 'HIGH',
          courseName: ca.courses.title,
          actionUrl: `/student/courses/${ca.courseId}`,
          testId: null,
          isDeadline: true,
        });
      }
    });

    // Add notification items
    notifications.forEach(n => {
      calendarItems.push({
        id: `notif-${n.id}`,
        date: n.createdAt.toISOString().split('T')[0],
        time: n.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        endTime: null,
        title: `📢 ${n.title}`,
        description: n.message,
        type: 'NOTIFICATION',
        priority: n.priority,
        courseName: null,
        actionUrl: '/student/notifications',
        testId: null,
        isDeadline: false,
      });
    });

    // Sort by date and time
    calendarItems.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    // Group by date
    const days: Array<{ date: string; dayName: string; isToday: boolean; events: typeof calendarItems }> = [];
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayName: dayNames[d.getDay()],
        isToday: dateStr === today,
        events: calendarItems.filter(e => e.date === dateStr),
      });
    }

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      days,
      totalEvents: calendarItems.length,
      upcomingDeadlines: calendarItems.filter(e => e.isDeadline).length,
    };
  }

  async getMonthCalendar(userId: string, year: number, month: number) {
    const student = await this.getStudentByUserId(userId);

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);

    // Schedule events
    const scheduleEvents = await this.prisma.schedule_events.findMany({
      where: {
        collegeId: student.collegeId,
        OR: [{ studentId: null }, { studentId: student.id }],
        startTime: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { startTime: 'asc' },
    });

    // Tests
    const testAssignments = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: {
          OR: [
            { scheduledStartTime: { gte: monthStart, lt: monthEnd } },
            { scheduledEndTime: { gte: monthStart, lt: monthEnd } },
          ],
        },
      },
      include: {
        test: {
          select: {
            id: true, title: true, subject: true, type: true, status: true,
            totalMarks: true, durationMinutes: true,
            scheduledStartTime: true, scheduledEndTime: true,
            course: { select: { title: true } },
          },
        },
      },
    });

    // Course deadlines
    const courseAssignments = await this.prisma.course_assignments.findMany({
      where: {
        studentId: student.id,
        dueDate: { gte: monthStart, lt: monthEnd },
      },
      include: { courses: { select: { title: true, courseCode: true } } },
    });

    // Notifications
    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId: student.collegeId,
        isActive: true,
        createdAt: { gte: monthStart, lt: monthEnd },
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'BATCH', academicYear: student.currentAcademicYear },
        ],
      },
      include: { creator: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    type CalItem = {
      id: string; date: string; time: string | null; endTime: string | null;
      title: string; description: string | null; type: string; priority: string;
      courseName: string | null; actionUrl: string | null; testId: string | null; isDeadline: boolean;
    };
    const items: CalItem[] = [];

    scheduleEvents.forEach(e => items.push({
      id: e.id,
      date: e.startTime.toISOString().split('T')[0],
      time: e.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      endTime: e.endTime ? e.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
      title: e.title, description: e.description, type: e.eventType,
      priority: 'NORMAL', courseName: null, actionUrl: null, testId: null, isDeadline: false,
    }));

    testAssignments.forEach(ta => {
      const t = ta.test;
      if (t.scheduledStartTime && t.scheduledStartTime >= monthStart && t.scheduledStartTime < monthEnd) {
        items.push({
          id: `test-${t.id}`,
          date: t.scheduledStartTime.toISOString().split('T')[0],
          time: t.scheduledStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: t.scheduledEndTime ? t.scheduledEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
          title: t.type === 'ASSIGNMENT' ? `📝 ${t.title}` : `📋 ${t.title}`,
          description: `${t.subject || ''} • ${t.totalMarks} marks • ${t.durationMinutes} mins`,
          type: t.type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'TEST',
          priority: t.status === 'ACTIVE' ? 'HIGH' : 'NORMAL',
          courseName: t.course?.title || null,
          actionUrl: `/student/assignments/${t.id}`, testId: t.id, isDeadline: false,
        });
      }
      if (t.scheduledEndTime && t.scheduledEndTime >= monthStart && t.scheduledEndTime < monthEnd) {
        items.push({
          id: `deadline-${t.id}`,
          date: t.scheduledEndTime.toISOString().split('T')[0],
          time: t.scheduledEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: null,
          title: `⏰ Deadline: ${t.title}`, description: 'Last date to submit',
          type: 'DEADLINE', priority: 'URGENT',
          courseName: t.course?.title || null,
          actionUrl: `/student/assignments/${t.id}`, testId: t.id, isDeadline: true,
        });
      }
    });

    courseAssignments.forEach(ca => {
      if (ca.dueDate) {
        items.push({
          id: `course-deadline-${ca.courseId}`,
          date: ca.dueDate.toISOString().split('T')[0],
          time: ca.dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: null,
          title: `📚 Course Deadline: ${ca.courses.title}`,
          description: 'Complete course by this date',
          type: 'COURSE_DEADLINE', priority: 'HIGH',
          courseName: ca.courses.title,
          actionUrl: `/student/courses/${ca.courseId}`, testId: null, isDeadline: true,
        });
      }
    });

    notifications.forEach(n => items.push({
      id: `notif-${n.id}`,
      date: n.createdAt.toISOString().split('T')[0],
      time: n.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      endTime: null,
      title: `📢 ${n.title}`, description: n.message,
      type: 'NOTIFICATION', priority: n.priority,
      courseName: null, actionUrl: '/student/notifications', testId: null, isDeadline: false,
    }));

    items.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      return dc !== 0 ? dc : (a.time || '').localeCompare(b.time || '');
    });

    const today = new Date().toISOString().split('T')[0];
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        isToday: dateStr === today,
        events: items.filter(e => e.date === dateStr),
      });
    }

    return { year, month, days, totalEvents: items.length };
  }

  /**
   * Get student notifications (governance + auto-generated)
   */
  async getStudentNotifications(userId: string) {
    const student = await this.getStudentByUserId(userId);

    // Get governance notifications
    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId: student.collegeId,
        isActive: true,
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'BATCH', academicYear: student.currentAcademicYear },
        ],
      },
      include: {
        creator: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get read notification IDs
    const readReceipts = await this.prisma.notification_reads.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const readIds = new Set(readReceipts.map(r => r.notificationId));

    // Get upcoming assignment/test deadlines to auto-generate reminders
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    const upcomingDeadlines = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: {
          status: { in: [TestStatus.SCHEDULED, TestStatus.ACTIVE] },
          scheduledEndTime: { gte: now, lte: threeDaysFromNow },
        },
      },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            type: true,
            scheduledEndTime: true,
            course: { select: { title: true } },
          },
        },
      },
    });

    // Build unified notification list
    const allNotifications: Array<{
      id: string;
      type: string;
      priority: string;
      title: string;
      message: string;
      createdAt: Date;
      isRead: boolean;
      senderName: string | null;
      actionUrl: string | null;
      category: string;
    }> = [];

    // Add governance notifications (these already cover course assignments, announcements etc.)
    notifications.forEach(n => {
      allNotifications.push({
        id: n.id,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        isRead: readIds.has(n.id),
        senderName: n.creator?.fullName || null,
        actionUrl: null,
        category: 'ANNOUNCEMENT',
      });
    });

    // Add auto-generated deadline reminders
    upcomingDeadlines.forEach(d => {
      const hoursLeft = Math.round((d.test.scheduledEndTime!.getTime() - now.getTime()) / (1000 * 60 * 60));
      const isUrgent = hoursLeft <= 24;
      allNotifications.push({
        id: `deadline-${d.testId}`,
        type: 'DEADLINE_REMINDER',
        priority: isUrgent ? 'URGENT' : 'HIGH',
        title: isUrgent
          ? `⚠️ ${d.test.type === 'ASSIGNMENT' ? 'Assignment' : 'Test'} due in ${hoursLeft}h!`
          : `⏰ ${d.test.type === 'ASSIGNMENT' ? 'Assignment' : 'Test'} deadline approaching`,
        message: `"${d.test.title}" ${d.test.course ? `(${d.test.course.title})` : ''} is due ${d.test.scheduledEndTime!.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        createdAt: now,
        isRead: false,
        senderName: 'System',
        actionUrl: `/student/assignments/${d.testId}`,
        category: 'DEADLINE',
      });
    });

    // NOTE: Course assignment notifications are sent via governance notifications when courses are assigned.
    // Do NOT add auto-generated course notifications here to avoid duplicates.

    // Sort by date (newest first), urgents first
    allNotifications.sort((a, b) => {
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
      if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
      notifications: allNotifications,
      unreadCount: allNotifications.filter(n => !n.isRead).length,
      totalCount: allNotifications.length,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId: string) {
    const student = await this.getStudentByUserId(userId);

    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId: student.collegeId,
        isActive: true,
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'BATCH', academicYear: student.currentAcademicYear },
        ],
      },
      select: { id: true },
    });

    const readIds = await this.prisma.notification_reads.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const readSet = new Set(readIds.map(r => r.notificationId));

    // Count upcoming deadlines (within 3 days)
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const deadlineCount = await this.prisma.test_assignments.count({
      where: {
        studentId: student.id,
        test: {
          status: { in: [TestStatus.SCHEDULED, TestStatus.ACTIVE] },
          scheduledEndTime: { gte: now, lte: threeDays },
        },
      },
    });

    const unreadNotifications = notifications.filter(n => !readSet.has(n.id)).length;

    return {
      unreadCount: unreadNotifications + deadlineCount,
      notificationCount: unreadNotifications,
      deadlineCount,
    };
  }

  /**
   * Mark a notification as read
   */
  async markNotificationRead(userId: string, notificationId: string) {
    // Only mark governance notifications (auto-generated ones can't be marked)
    if (notificationId.startsWith('deadline-') || notificationId.startsWith('course-assign-')) {
      return { success: true };
    }

    await this.prisma.notification_reads.upsert({
      where: {
        notificationId_userId: { notificationId, userId },
      },
      create: {
        id: uuidv4(),
        notificationId,
        userId,
      },
      update: {},
    });

    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: string) {
    const student = await this.getStudentByUserId(userId);

    const notifications = await this.prisma.notifications.findMany({
      where: {
        collegeId: student.collegeId,
        isActive: true,
        OR: [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'BATCH', academicYear: student.currentAcademicYear },
        ],
      },
      select: { id: true },
    });

    const readIds = await this.prisma.notification_reads.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const alreadyRead = new Set(readIds.map(r => r.notificationId));

    const unread = notifications.filter(n => !alreadyRead.has(n.id));

    if (unread.length > 0) {
      await this.prisma.notification_reads.createMany({
        data: unread.map(n => ({
          id: uuidv4(),
          notificationId: n.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    return { success: true, markedCount: unread.length };
  }

  // Helper methods
  // ════════════════════════════════════════════════════════════════
  //  LIBRARY MANAGEMENT (persistent student_library)
  // ════════════════════════════════════════════════════════════════

  /**
   * Get student's library – combines saved items + current course content
   */
  async getMyLibraryV2(userId: string) {
    const student = await this.getStudentByUserId(userId);

    // 1. Get all persisted library entries
    const savedItems = await this.prisma.student_library.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Get course content (current assignments)
    const assignments = await this.prisma.course_assignments.findMany({
      where: { studentId: student.id },
      include: {
        courses: {
          include: {
            learning_flow_steps: {
              include: {
                learning_units: {
                  select: {
                    id: true, title: true, description: true, type: true,
                    subject: true, topic: true, estimatedDuration: true,
                    thumbnailUrl: true, publisherId: true,
                  },
                },
              },
              orderBy: { stepOrder: 'asc' },
            },
            users: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    // 3. Get progress records
    const progressRecords = await this.prisma.student_progress.findMany({
      where: { studentId: student.id },
    });
    const progressMap = new Map(progressRecords.map(p => [p.courseId, p]));

    // 4. Build course content items
    const courseItems: any[] = [];
    assignments.forEach(a => {
      const progress = progressMap.get(a.courseId);
      const totalSteps = a.courses.learning_flow_steps.length;
      const completedCount = progress?.completedSteps?.length || 0;
      const isCompleted = progress?.status === 'COMPLETED' || (totalSteps > 0 && completedCount >= totalSteps);

      a.courses.learning_flow_steps.forEach(step => {
        const unit = step.learning_units;
        courseItems.push({
          id: unit.id,
          title: unit.title,
          description: unit.description,
          type: unit.type,
          subject: unit.subject,
          topic: unit.topic,
          duration: unit.estimatedDuration,
          thumbnail: unit.thumbnailUrl,
          courseId: a.courseId,
          courseTitle: a.courses.title,
          facultyName: a.courses.users?.fullName,
          isFacultyCreated: !unit.publisherId,
          isFromCompletedCourse: isCompleted,
          source: 'COURSE',
        });
      });
    });

    // 5. Map saved library entries
    const savedMapped = savedItems.map(item => ({
      libraryId: item.id,
      entryType: item.entryType,
      title: item.title,
      description: item.description,
      subject: item.subject,
      courseId: item.courseId,
      learningUnitId: item.learningUnitId,
      testId: item.testId,
      attemptId: item.attemptId,
      score: item.score,
      percentageScore: item.percentageScore,
      addedVia: item.addedVia,
      savedAt: item.createdAt,
      source: 'SAVED',
    }));

    // 6. Compute counts
    const resultItems = savedMapped.filter(s =>
      s.entryType === 'ASSIGNMENT_RESULT' || s.entryType === 'TEST_RESULT'
    );

    return {
      courseContent: courseItems,
      savedItems: savedMapped,
      results: resultItems,
      summary: {
        totalCourseContent: courseItems.length,
        totalSavedItems: savedMapped.length,
        totalResults: resultItems.length,
        booksCount: courseItems.filter(c => c.type === 'BOOK' || c.type === 'EBOOK').length,
        videosCount: courseItems.filter(c => c.type === 'VIDEO').length,
        documentsCount: courseItems.filter(c => c.type === 'DOCUMENT' || c.type === 'HANDBOOK' || c.type === 'PPT').length,
      },
    };
  }

  /**
   * Add a course to library (after completion prompt)
   */
  async addCourseToLibrary(userId: string, courseId: string) {
    const student = await this.getStudentByUserId(userId);

    // Verify course is assigned and completed
    const assignment = await this.prisma.course_assignments.findFirst({
      where: { courseId, studentId: student.id },
      include: { courses: { select: { title: true } } },
    });
    if (!assignment) throw new NotFoundException('Course not assigned');

    const progress = await this.prisma.student_progress.findFirst({
      where: { studentId: student.id, courseId },
    });

    // Get learning units from the course
    const steps = await this.prisma.learning_flow_steps.findMany({
      where: { courseId },
      include: {
        learning_units: { select: { id: true, title: true, type: true, subject: true } },
      },
    });

    // Save each learning unit to library
    const results = [];
    for (const step of steps) {
      try {
        const entry = await this.prisma.student_library.upsert({
          where: {
            studentId_courseId_learningUnitId: {
              studentId: student.id,
              courseId,
              learningUnitId: step.learningUnitId,
            },
          },
          create: {
            studentId: student.id,
            entryType: 'COURSE_CONTENT',
            courseId,
            learningUnitId: step.learningUnitId,
            title: step.learning_units.title,
            subject: step.learning_units.subject,
            addedVia: 'PROMPT_ACCEPTED',
          },
          update: {},
        });
        results.push(entry);
      } catch (e) {
        // skip duplicates
      }
    }

    return { added: results.length, courseTitle: assignment.courses.title };
  }

  /**
   * Remove item from library
   */
  async removeFromLibrary(userId: string, libraryId: string) {
    const student = await this.getStudentByUserId(userId);
    const item = await this.prisma.student_library.findFirst({
      where: { id: libraryId, studentId: student.id },
    });
    if (!item) throw new NotFoundException('Library item not found');
    await this.prisma.student_library.delete({ where: { id: libraryId } });
    return { removed: true };
  }

  /**
   * Check course completion status (for "Add to Library?" prompt)
   */
  async getCourseCompletionStatus(userId: string, courseId: string) {
    const student = await this.getStudentByUserId(userId);

    const progress = await this.prisma.student_progress.findFirst({
      where: { studentId: student.id, courseId },
    });

    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      select: { title: true, courseType: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const totalSteps = await this.prisma.learning_flow_steps.count({ where: { courseId } });
    const completedCount = progress?.completedSteps?.length || 0;
    const isCompleted = progress?.status === 'COMPLETED' || (totalSteps > 0 && completedCount >= totalSteps);

    // Check if already in library
    const alreadyInLibrary = await this.prisma.student_library.count({
      where: { studentId: student.id, courseId },
    });

    // Self-paced courses are auto-added
    const isSelfPaced = course.courseType === 'SELF_PACED';

    return {
      courseId,
      courseTitle: course.title,
      isCompleted,
      isSelfPaced,
      alreadyInLibrary: alreadyInLibrary > 0,
      progress: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
      shouldPrompt: isCompleted && !isSelfPaced && alreadyInLibrary === 0,
      autoAdded: isCompleted && isSelfPaced,
    };
  }

  /**
   * Auto-save self-paced completed course to library
   */
  async autoSaveSelfPacedToLibrary(studentId: string, courseId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      select: { title: true, courseType: true },
    });
    if (!course || course.courseType !== 'SELF_PACED') return;

    const steps = await this.prisma.learning_flow_steps.findMany({
      where: { courseId },
      include: { learning_units: { select: { id: true, title: true, subject: true } } },
    });

    for (const step of steps) {
      try {
        await this.prisma.student_library.upsert({
          where: {
            studentId_courseId_learningUnitId: {
              studentId,
              courseId,
              learningUnitId: step.learningUnitId,
            },
          },
          create: {
            studentId,
            entryType: 'SELF_PACED',
            courseId,
            learningUnitId: step.learningUnitId,
            title: step.learning_units.title,
            subject: step.learning_units.subject,
            addedVia: 'AUTO_SELF_PACED',
          },
          update: {},
        });
      } catch (e) { /* skip */ }
    }
  }

  /**
   * Auto-save test/assignment result to library (called after submitAttempt)
   */
  private async autoSaveResultToLibrary(studentId: string, test: any, attempt: any) {
    const entryType = test.type === 'ASSIGNMENT' ? 'ASSIGNMENT_RESULT' : 'TEST_RESULT';
    try {
      await this.prisma.student_library.upsert({
        where: {
          studentId_attemptId: {
            studentId,
            attemptId: attempt.id,
          },
        },
        create: {
          studentId,
          entryType,
          testId: test.id,
          attemptId: attempt.id,
          title: test.title,
          subject: test.subject,
          score: attempt.totalScore,
          percentageScore: attempt.percentageScore,
          addedVia: 'AUTO_ASSIGNMENT',
        },
        update: {
          score: attempt.totalScore,
          percentageScore: attempt.percentageScore,
        },
      });
    } catch (e) {
      // ignore duplicate errors
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  ASSIGNMENT-SPECIFIC ENDPOINTS  
  // ════════════════════════════════════════════════════════════════

  /**
   * Get only assignments (MCQ-based) for student
   */
  async getMyAssignments(userId: string) {
    const student = await this.getStudentByUserId(userId);

    const testAssignments = await this.prisma.test_assignments.findMany({
      where: {
        studentId: student.id,
        test: { type: 'ASSIGNMENT' },
      },
      include: {
        test: {
          select: {
            id: true, title: true, description: true, subject: true,
            type: true, status: true, totalQuestions: true, totalMarks: true,
            passingMarks: true, durationMinutes: true, courseId: true,
            scheduledStartTime: true, scheduledEndTime: true,
            allowMultipleAttempts: true, maxAttempts: true,
            showAnswersAfter: true, showExplanations: true,
            negativeMarking: true, negativeMarkValue: true,
            course: { select: { title: true, courseCode: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Get attempts
    const testIds = testAssignments.map(ta => ta.testId);
    const attempts = await this.prisma.test_attempts.findMany({
      where: { studentId: student.id, testId: { in: testIds } },
      orderBy: { attemptNumber: 'desc' },
    });

    return testAssignments.map(ta => {
      const testAttempts = attempts.filter(a => a.testId === ta.testId);
      const latestAttempt = testAttempts[0] || null;
      const bestAttempt = testAttempts.reduce((best, curr) => {
        if (!best) return curr;
        return (curr.totalScore || 0) > (best.totalScore || 0) ? curr : best;
      }, null as typeof testAttempts[0] | null);

      return {
        id: ta.testId,
        title: ta.test.title,
        description: ta.test.description,
        subject: ta.test.subject,
        course: ta.test.course,
        totalQuestions: ta.test.totalQuestions,
        totalMarks: ta.test.totalMarks,
        passingMarks: ta.test.passingMarks,
        durationMinutes: ta.test.durationMinutes,
        dueDate: ta.dueDate || ta.test.scheduledEndTime,
        assignedAt: ta.assignedAt,
        status: ta.test.status,
        canAttempt: this.canAttemptTest(ta.test, testAttempts),
        attemptCount: testAttempts.length,
        maxAttempts: ta.test.maxAttempts,
        latestAttempt: latestAttempt ? {
          id: latestAttempt.id,
          status: latestAttempt.status,
          score: latestAttempt.totalScore,
          percentageScore: latestAttempt.percentageScore,
          isPassed: latestAttempt.isPassed,
          submittedAt: latestAttempt.submittedAt,
          timeSpent: latestAttempt.timeSpentSeconds,
        } : null,
        bestScore: bestAttempt?.totalScore ?? null,
        bestPercentage: bestAttempt?.percentageScore ?? null,
      };
    });
  }

  private async getStudentByUserId(userId: string) {
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  private canAttemptTest(test: any, attempts: any[]): boolean {
    const now = new Date();
    
    // Check test status
    if (test.status !== TestStatus.ACTIVE) return false;
    
    // Check timing
    if (test.scheduledStartTime && now < test.scheduledStartTime) return false;
    if (test.scheduledEndTime && now > test.scheduledEndTime) return false;
    
    // Allow resuming an in-progress attempt (must check BEFORE attempt limit checks)
    const hasInProgress = attempts.some(a => a.status === AttemptStatus.IN_PROGRESS);
    if (hasInProgress) return true;
    
    // Only count completed/submitted attempts against the limit
    const completedAttempts = attempts.filter(a => a.status !== AttemptStatus.IN_PROGRESS);
    
    // Check attempts
    if (!test.allowMultipleAttempts && completedAttempts.length > 0) return false;
    if (completedAttempts.length >= test.maxAttempts) return false;
    
    return true;
  }

  private async getAttemptWithQuestions(attemptId: string) {
    const attempt = await this.prisma.test_attempts.findUnique({
      where: { id: attemptId },
      include: {
        test: { include: { questions: true } },
        responses: true,
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');

    // Get MCQ details
    const mcqIds = attempt.test.questions.map(q => q.mcqId);
    const mcqs = await this.prisma.mcqs.findMany({
      where: { id: { in: mcqIds } },
      select: {
        id: true,
        question: true,
        questionImage: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        optionE: true,
      },
    });

    let questions = attempt.test.questions;
    if (attempt.test.shuffleQuestions) {
      // Use stored order if available
      questions = [...questions].sort((a, b) => a.questionOrder - b.questionOrder);
    }

    const questionsWithDetails = questions.map((q, index) => {
      const mcq = mcqs.find(m => m.id === q.mcqId);
      const response = attempt.responses.find(r => r.mcqId === q.mcqId);
      return {
        questionOrder: index + 1,
        mcqId: q.mcqId,
        marks: q.marks,
        question: mcq?.question,
        questionImage: mcq?.questionImage,
        options: {
          A: mcq?.optionA,
          B: mcq?.optionB,
          C: mcq?.optionC,
          D: mcq?.optionD,
          E: mcq?.optionE,
        },
        savedAnswer: response?.selectedAnswer || null,
      };
    });

    const elapsed = attempt.startedAt 
      ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;
    const remainingSeconds = Math.max(0, attempt.test.durationMinutes * 60 - elapsed);

    return {
      attemptId: attempt.id,
      testId: attempt.testId,
      title: attempt.test.title,
      totalQuestions: attempt.test.totalQuestions,
      totalMarks: attempt.test.totalMarks,
      durationMinutes: attempt.test.durationMinutes,
      startedAt: attempt.startedAt,
      remainingSeconds,
      questions: questionsWithDetails,
      answeredCount: attempt.responses.filter(r => r.selectedAnswer).length,
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Rate a course (creates or updates the rating)
   */
  async rateCourse(userId: string, courseId: string, rating: number, feedback?: string) {
    const student = await this.getStudentByUserId(userId);

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Verify the course exists
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
      select: { id: true, facultyId: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Upsert the COURSE rating
    const existingRating = await this.prisma.ratings.findUnique({
      where: {
        studentId_ratingType_entityId: {
          studentId: student.id,
          ratingType: 'COURSE',
          entityId: courseId,
        },
      },
    });

    if (existingRating) {
      await this.prisma.ratings.update({
        where: { id: existingRating.id },
        data: { rating, feedback: feedback || existingRating.feedback },
      });
    } else {
      await this.prisma.ratings.create({
        data: {
          studentId: student.id,
          collegeId: student.collegeId,
          ratingType: 'COURSE',
          entityId: courseId,
          rating,
          feedback: feedback || null,
          isAnonymous: true,
        },
      });
    }

    // Also upsert a TEACHER rating so teacher performance analytics reflects course ratings
    if (course.facultyId) {
      const existingTeacherRating = await this.prisma.ratings.findUnique({
        where: {
          studentId_ratingType_entityId: {
            studentId: student.id,
            ratingType: 'TEACHER',
            entityId: course.facultyId,
          },
        },
      });
      if (existingTeacherRating) {
        await this.prisma.ratings.update({
          where: { id: existingTeacherRating.id },
          data: { rating },
        });
      } else {
        await this.prisma.ratings.create({
          data: {
            studentId: student.id,
            collegeId: student.collegeId,
            ratingType: 'TEACHER',
            entityId: course.facultyId,
            rating,
            isAnonymous: true,
          },
        });
      }
    }

    // Get the updated average for the course
    const agg = await this.prisma.ratings.aggregate({
      where: { ratingType: 'COURSE', entityId: courseId },
      _avg: { rating: true },
      _count: true,
    });

    return {
      message: 'Rating submitted successfully',
      averageRating: Math.round((agg._avg.rating || 0) * 10) / 10,
      totalRatings: agg._count,
      yourRating: rating,
    };
  }

  async getPackageLibrary(userId: string) {
    const student = await this.getStudentByUserId(userId);
    const yearOrder = [
      'YEAR_1', 'FIRST_YEAR',
      'YEAR_2', 'SECOND_YEAR',
      'YEAR_3_MINOR', 'THIRD_YEAR', 'PART_1',
      'YEAR_3_MAJOR', 'FOURTH_YEAR', 'PART_2',
      'FIFTH_YEAR',
      'INTERNSHIP',
    ];
    const studentYearIdx = yearOrder.indexOf(student.currentAcademicYear);
    const allowedYears: string[] = studentYearIdx >= 0
      ? yearOrder.slice(0, studentYearIdx + 1)
      : yearOrder;

    const activePackages = await this.prisma.college_packages.findMany({
      where: { collegeId: student.collegeId, status: 'ACTIVE' },
      include: { package: { select: { publisherId: true } } },
    });
    const publisherIds = [...new Set(activePackages.map((cp: any) => cp.package.publisherId))];

    if (publisherIds.length === 0) {
      return { total: 0, items: [], currentYear: student.currentAcademicYear, allowedYears };
    }

    const units = await this.prisma.learning_units.findMany({
      where: {
        publisherId: { in: publisherIds },
        status: 'ACTIVE',
        OR: [
          { topicId: null },
          { topicRef: { is: null } },
          { topicRef: { academicYear: null } },
          { topicRef: { academicYear: { in: allowedYears as any } } },
        ],
      },
      include: {
        topicRef: { select: { name: true, academicYear: true, subject: true } },
      },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
    });

    const items = units.map((u: any) => ({
      id: u.id,
      title: u.title,
      type: u.type,
      subject: u.subject || u.topicRef?.subject,
      topic: u.topicRef?.name || u.topic,
      academicYear: u.topicRef?.academicYear || null,
      thumbnailUrl: u.thumbnailUrl || u.coverImageUrl,
      estimatedDuration: u.estimatedDuration,
      description: u.description,
      author: u.author,
      tags: u.tags,
    }));

    return { total: items.length, items, currentYear: student.currentAcademicYear, allowedYears };
  }
}
