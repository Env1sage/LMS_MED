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
        totalStudyHours: 0, // TODO: Calculate from progress data
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
   */
  async getMyLibrary(userId: string) {
    const student = await this.getStudentByUserId(userId);

    // Get all assigned courses with learning units
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
                  },
                },
              },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    // Group by type
    const library = {
      ebooks: [] as any[],
      videos: [] as any[],
      interactives: [] as any[],
    };

    assignments.forEach(a => {
      a.courses.learning_flow_steps.forEach(step => {
        const unit = step.learning_units;
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
        };

        const unitType = unit.type as string;
        if (unitType === 'BOOK' || unitType === 'NOTES') library.ebooks.push(item);
        else if (unitType === 'VIDEO') library.videos.push(item);
        else if (unitType === 'MCQ') library.interactives.push(item);
      });
    });

    return {
      totalItems: library.ebooks.length + library.videos.length + library.interactives.length,
      ebooks: library.ebooks,
      videos: library.videos,
      interactives: library.interactives,
    };
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
        courses: { select: { title: true, courseCode: true } },
      },
    });

    // Test performance
    const testAttempts = await this.prisma.test_attempts.findMany({
      where: { studentId: student.id, status: AttemptStatus.SUBMITTED },
      include: {
        test: { select: { title: true, subject: true, type: true, totalMarks: true } },
      },
      orderBy: { submittedAt: 'desc' },
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
        startedAt: p.startedAt,
        completedAt: p.completedAt,
      })),
      subjectPerformance: Object.entries(subjectPerformance).map(([subject, data]) => ({
        subject,
        averageScore: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        testsAttempted: data.tests,
      })),
      recentTests: recentAttempts.slice(0, 10).map(a => ({
        testTitle: a.test.title,
        subject: a.test.subject,
        type: a.test.type,
        score: a.totalScore,
        totalMarks: a.test.totalMarks,
        percentage: a.percentageScore,
        isPassed: a.isPassed,
        attemptedAt: a.submittedAt,
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

  // Helper methods
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
    
    // Check attempts
    if (!test.allowMultipleAttempts && attempts.length > 0) return false;
    if (attempts.length >= test.maxAttempts) return false;
    
    // Check for in-progress attempt
    const hasInProgress = attempts.some(a => a.status === AttemptStatus.IN_PROGRESS);
    if (hasInProgress) return true; // Can continue
    
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
}
