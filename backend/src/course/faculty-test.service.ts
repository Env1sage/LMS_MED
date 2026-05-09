import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

let parseCsv: any;
try { parseCsv = require('csv-parse/sync').parse; } catch { parseCsv = null; }

@Injectable()
export class FacultyTestService {
  constructor(private prisma: PrismaService) {}

  async createTest(facultyId: string, collegeId: string, body: any) {
    const { courseId, title, description, type, subject, totalMarks, passingMarks, durationMinutes, ...rest } = body;

    if (courseId) {
      const course = await this.prisma.courses.findFirst({
        where: { id: courseId, facultyId },
      });
      if (!course) throw new BadRequestException('Course not found or not owned by you');
    }

    const test = await this.prisma.tests.create({
      data: {
        id: uuidv4(),
        courseId: courseId || null,
        createdBy: facultyId,
        collegeId,
        title,
        description: description || '',
        type: type || 'SCHEDULED_TEST',
        status: 'DRAFT',
        subject: subject || '',
        totalQuestions: 0,
        totalMarks: totalMarks || 0,
        passingMarks: passingMarks || null,
        durationMinutes: durationMinutes || 60,
        shuffleQuestions: rest.shuffleQuestions ?? true,
        showAnswersAfter: rest.showAnswersAfterSubmit ?? false,
        showExplanations: rest.showExplanations ?? false,
        allowMultipleAttempts: rest.allowMultipleAttempts ?? false,
        maxAttempts: rest.maxAttempts || 1,
        negativeMarking: rest.negativeMarkingEnabled ?? false,
        negativeMarkValue: rest.negativeMarkPerQuestion || 0,
      },
    });

    return test;
  }

  async getMyTests(facultyId: string, courseId?: string) {
    const where: any = { createdBy: facultyId };
    if (courseId) where.courseId = courseId;

    return this.prisma.tests.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        _count: {
          select: { questions: true, assignments: true, attempts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTest(testId: string, facultyId: string) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
      include: {
        course: { select: { id: true, title: true } },
        questions: {
          orderBy: { questionOrder: 'asc' },
        },
        assignments: {
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async updateTest(testId: string, facultyId: string, body: any) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (test.status === 'COMPLETED') throw new BadRequestException('Cannot update completed test');

    return this.prisma.tests.update({
      where: { id: testId },
      data: {
        title: body.title,
        description: body.description,
        durationMinutes: body.durationMinutes,
        totalMarks: body.totalMarks,
        passingMarks: body.passingMarks,
        shuffleQuestions: body.shuffleQuestions,
        showAnswersAfter: body.showAnswersAfterSubmit,
        showExplanations: body.showExplanations,
        negativeMarking: body.negativeMarkingEnabled,
        negativeMarkValue: body.negativeMarkPerQuestion,
      },
    });
  }

  async deleteTest(testId: string, facultyId: string) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
    });
    if (!test) throw new NotFoundException('Test not found');

    await this.prisma.tests.delete({ where: { id: testId } });
    return { message: 'Test deleted' };
  }

  async addQuestionsToTest(testId: string, facultyId: string, mcqIds: string[], marks: number) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
    });
    if (!test) throw new NotFoundException('Test not found');

    const existingQuestions = await this.prisma.test_questions.findMany({
      where: { testId },
      select: { mcqId: true, questionOrder: true },
    });

    const existingMcqIds = new Set(existingQuestions.map(q => q.mcqId));
    const maxOrder = existingQuestions.length > 0
      ? Math.max(...existingQuestions.map(q => q.questionOrder))
      : 0;

    const newQuestions = mcqIds
      .filter(id => !existingMcqIds.has(id))
      .map((mcqId, idx) => ({
        id: uuidv4(),
        testId,
        mcqId,
        questionOrder: maxOrder + idx + 1,
        marks,
      }));

    if (newQuestions.length > 0) {
      await this.prisma.test_questions.createMany({ data: newQuestions });
    }

    // Update test totals
    const totalQuestions = existingQuestions.length + newQuestions.length;
    await this.prisma.tests.update({
      where: { id: testId },
      data: {
        totalQuestions,
        totalMarks: totalQuestions * marks,
      },
    });

    return { added: newQuestions.length, totalQuestions };
  }

  async removeQuestionFromTest(testId: string, facultyId: string, questionId: string) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
    });
    if (!test) throw new NotFoundException('Test not found');

    await this.prisma.test_questions.delete({ where: { id: questionId } });

    // Recount
    const count = await this.prisma.test_questions.count({ where: { testId } });
    await this.prisma.tests.update({
      where: { id: testId },
      data: { totalQuestions: count },
    });

    return { message: 'Question removed', totalQuestions: count };
  }

  async assignTest(testId: string, facultyId: string, studentIds: string[], dueDate?: string) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
    });
    if (!test) throw new NotFoundException('Test not found');

    const assignments = studentIds.map(studentId => ({
      id: uuidv4(),
      testId,
      studentId,
      assignedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'ASSIGNED' as const,
    }));

    await this.prisma.test_assignments.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    return { assigned: assignments.length };
  }

  async publishTest(testId: string, facultyId: string) {
    const test = await this.prisma.tests.findFirst({
      where: { id: testId, createdBy: facultyId },
      include: { _count: { select: { questions: true } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (test._count.questions === 0) throw new BadRequestException('Cannot publish test with no questions');

    return this.prisma.tests.update({
      where: { id: testId },
      data: { status: 'ACTIVE' },
    });
  }

  // --- MCQ Management ---

  async createMcq(facultyId: string, body: any) {
    return this.prisma.mcqs.create({
      data: {
        id: uuidv4(),
        question: body.question,
        questionImage: body.questionImage || null,
        optionA: body.optionA,
        optionB: body.optionB,
        optionC: body.optionC || null,
        optionD: body.optionD || null,
        optionE: body.optionE || null,
        correctAnswer: body.correctAnswer,
        explanation: body.explanation || null,
        subject: body.subject || '',
        topic: body.topic || null,
        mcqType: body.mcqType || 'NORMAL',
        difficultyLevel: body.difficultyLevel || 'K',
        bloomsLevel: body.bloomsLevel || 'REMEMBER',
        tags: body.tags || [],
        createdBy: facultyId,
        publisherId: facultyId,
        updatedAt: new Date(),
        status: 'PUBLISHED',
      },
    });
  }

  async getMyMcqs(facultyId: string, subject?: string) {
    const where: any = { createdBy: facultyId };
    if (subject) where.subject = subject;

    return this.prisma.mcqs.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getAvailableMcqs(collegeId: string, subject?: string) {
    // Get MCQs from package publishers
    const packages = await this.prisma.college_packages.findMany({
      where: { collegeId, status: 'ACTIVE' },
      include: { package: { select: { publisherId: true } } },
    });

    const publisherIds = [...new Set(packages.map(p => p.package.publisherId))];

    const where: any = {
      publisherId: { in: publisherIds },
      status: 'PUBLISHED',
    };
    if (subject) where.subject = subject;

    return this.prisma.mcqs.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async bulkUploadMcqs(facultyId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const content = file.buffer.toString('utf-8');
    let records: any[];
    if (!parseCsv) throw new BadRequestException('CSV parsing not available');
    try {
      records = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException('Invalid CSV format');
    }

    const mcqs = records.map(r => ({
      id: uuidv4(),
      question: r.question || r.Question || '',
      optionA: r.optionA || r.option_a || r['Option A'] || '',
      optionB: r.optionB || r.option_b || r['Option B'] || '',
      optionC: r.optionC || r.option_c || r['Option C'] || null,
      optionD: r.optionD || r.option_d || r['Option D'] || null,
      optionE: r.optionE || r.option_e || r['Option E'] || null,
      correctAnswer: r.correctAnswer || r.correct_answer || r['Correct Answer'] || 'A',
      explanation: r.explanation || r.Explanation || null,
      subject: r.subject || r.Subject || '',
      topic: r.topic || r.Topic || null,
      mcqType: 'NORMAL' as const,
      difficultyLevel: r.difficultyLevel || r.difficulty || 'K',
      bloomsLevel: r.bloomsLevel || 'REMEMBER',
      tags: r.tags ? r.tags.split(';') : [],
      createdBy: facultyId,
      publisherId: facultyId,
      updatedAt: new Date(),
      status: 'PUBLISHED' as const,
    })).filter(m => m.question && m.optionA && m.optionB);

    if (mcqs.length === 0) throw new BadRequestException('No valid MCQs found in CSV');

    await this.prisma.mcqs.createMany({ data: mcqs });

    return { uploaded: mcqs.length, total: records.length };
  }
}
