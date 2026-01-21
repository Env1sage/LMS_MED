import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import csv from 'csv-parser';
import {
  CreateMcqDto,
  UpdateMcqDto,
  GetMcqsQueryDto,
  VerifyMcqDto,
  McqResponseDto,
  McqStatsDto,
} from './dto/mcq.dto';

@Injectable()
export class McqService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMcqDto, userId: string, publisherId: string): Promise<McqResponseDto> {
    // Validate correct answer
    const validAnswers = ['A', 'B', 'C', 'D'];
    if (dto.optionE) validAnswers.push('E');
    
    if (!validAnswers.includes(dto.correctAnswer.toUpperCase())) {
      throw new BadRequestException('Invalid correct answer. Must be one of: ' + validAnswers.join(', '));
    }

    const mcq = await this.prisma.mcqs.create({
      data: {
        id: uuidv4(),
        question: dto.question,
        questionImage: dto.questionImage,
        optionA: dto.optionA,
        optionB: dto.optionB,
        optionC: dto.optionC,
        optionD: dto.optionD,
        optionE: dto.optionE,
        correctAnswer: dto.correctAnswer.toUpperCase(),
        explanation: dto.explanation,
        explanationImage: dto.explanationImage,
        subject: dto.subject,
        topic: dto.topic,
        difficultyLevel: dto.difficultyLevel,
        bloomsLevel: dto.bloomsLevel,
        competencyIds: dto.competencyIds || [],
        tags: dto.tags || [],
        year: dto.year,
        source: dto.source,
        publisherId,
        createdBy: userId,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.mapToResponse(mcq);
  }

  async findAll(query: GetMcqsQueryDto, publisherId: string) {
    const { page = 1, limit = 20, subject, topic, status, difficultyLevel, search, competencyIds } = query;
    const skip = (page - 1) * limit;

    const where: any = { publisherId };

    if (subject) where.subject = subject;
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };
    if (status) where.status = status;
    if (difficultyLevel) where.difficultyLevel = difficultyLevel;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (competencyIds && competencyIds.length > 0) {
      where.competencyIds = { hasSome: competencyIds };
    }

    const [mcqs, total] = await Promise.all([
      this.prisma.mcqs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.mcqs.count({ where }),
    ]);

    return {
      data: mcqs.map(mcq => this.mapToResponse(mcq)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, publisherId: string): Promise<McqResponseDto> {
    const mcq = await this.prisma.mcqs.findFirst({
      where: { id, publisherId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        verifier: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!mcq) {
      throw new NotFoundException('MCQ not found');
    }

    return this.mapToResponse(mcq);
  }

  async update(id: string, dto: UpdateMcqDto, userId: string, publisherId: string): Promise<McqResponseDto> {
    const mcq = await this.prisma.mcqs.findFirst({
      where: { id, publisherId },
    });

    if (!mcq) {
      throw new NotFoundException('MCQ not found');
    }

    // Validate correct answer if provided
    if (dto.correctAnswer) {
      const validAnswers = ['A', 'B', 'C', 'D'];
      if (mcq.optionE || dto.optionE) validAnswers.push('E');
      
      if (!validAnswers.includes(dto.correctAnswer.toUpperCase())) {
        throw new BadRequestException('Invalid correct answer');
      }
    }

    const updated = await this.prisma.mcqs.update({
      where: { id },
      data: {
        ...dto,
        correctAnswer: dto.correctAnswer?.toUpperCase(),
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  async delete(id: string, publisherId: string): Promise<void> {
    const mcq = await this.prisma.mcqs.findFirst({
      where: { id, publisherId },
    });

    if (!mcq) {
      throw new NotFoundException('MCQ not found');
    }

    await this.prisma.mcqs.delete({ where: { id } });
  }

  async verify(id: string, dto: VerifyMcqDto, userId: string, publisherId: string): Promise<McqResponseDto> {
    const mcq = await this.prisma.mcqs.findFirst({
      where: { id, publisherId },
    });

    if (!mcq) {
      throw new NotFoundException('MCQ not found');
    }

    const updated = await this.prisma.mcqs.update({
      where: { id },
      data: {
        isVerified: dto.approve,
        verifiedBy: dto.approve ? userId : null,
        verifiedAt: dto.approve ? new Date() : null,
        status: dto.approve ? 'PUBLISHED' : 'DRAFT',
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        verifier: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  async getStats(publisherId: string): Promise<McqStatsDto> {
    const [total, mcqs] = await Promise.all([
      this.prisma.mcqs.count({ where: { publisherId } }),
      this.prisma.mcqs.findMany({
        where: { publisherId },
        select: {
          status: true,
          subject: true,
          difficultyLevel: true,
          isVerified: true,
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    let verified = 0;
    let unverified = 0;

    mcqs.forEach(mcq => {
      byStatus[mcq.status] = (byStatus[mcq.status] || 0) + 1;
      bySubject[mcq.subject] = (bySubject[mcq.subject] || 0) + 1;
      byDifficulty[mcq.difficultyLevel] = (byDifficulty[mcq.difficultyLevel] || 0) + 1;
      if (mcq.isVerified) verified++;
      else unverified++;
    });

    return {
      total,
      byStatus,
      bySubject,
      byDifficulty,
      verified,
      unverified,
    };
  }

  private mapToResponse(mcq: any): McqResponseDto {
    return {
      id: mcq.id,
      question: mcq.question,
      questionImage: mcq.questionImage,
      optionA: mcq.optionA,
      optionB: mcq.optionB,
      optionC: mcq.optionC,
      optionD: mcq.optionD,
      optionE: mcq.optionE,
      correctAnswer: mcq.correctAnswer,
      explanation: mcq.explanation,
      explanationImage: mcq.explanationImage,
      subject: mcq.subject,
      topic: mcq.topic,
      difficultyLevel: mcq.difficultyLevel,
      bloomsLevel: mcq.bloomsLevel,
      competencyIds: mcq.competencyIds,
      tags: mcq.tags,
      year: mcq.year,
      source: mcq.source,
      status: mcq.status,
      isVerified: mcq.isVerified,
      verifiedBy: mcq.verifiedBy,
      verifiedAt: mcq.verifiedAt,
      usageCount: mcq.usageCount,
      correctRate: mcq.correctRate,
      createdAt: mcq.createdAt,
      updatedAt: mcq.updatedAt,
      creator: mcq.creator,
    };
  }

  async bulkUploadFromCsv(
    file: Express.Multer.File,
    userId: string,
    publisherId: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    const results: any[] = [];
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    return new Promise<{ success: number; failed: number; errors: string[] }>((resolve, reject) => {
      const stream = Readable.from(file.buffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (row: any) => results.push(row))
        .on('end', async () => {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              // Map CSV columns to MCQ fields
              const mcqData: CreateMcqDto = {
                question: row.question || row.Question,
                questionImage: row.questionImage || row.question_image,
                optionA: row.optionA || row.option_a || row.OptionA,
                optionB: row.optionB || row.option_b || row.OptionB,
                optionC: row.optionC || row.option_c || row.OptionC,
                optionD: row.optionD || row.option_d || row.OptionD,
                optionE: row.optionE || row.option_e || row.OptionE,
                correctAnswer: (row.correctAnswer || row.correct_answer || row.CorrectAnswer).toUpperCase(),
                explanation: row.explanation || row.Explanation,
                explanationImage: row.explanationImage || row.explanation_image,
                subject: row.subject || row.Subject,
                topic: row.topic || row.Topic,
                difficultyLevel: row.difficultyLevel || row.difficulty || 'INTERMEDIATE',
                bloomsLevel: row.bloomsLevel || row.blooms_level || 'UNDERSTAND',
                competencyIds: row.competencyIds ? row.competencyIds.split(',').map((id: string) => id.trim()) : [],
                tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : [],
                year: row.year ? parseInt(row.year) : undefined,
                source: row.source || row.Source,
              };

              await this.create(mcqData, userId, publisherId);
              success++;
            } catch (error) {
              failed++;
              errors.push(`Row ${i + 2}: ${error.message}`);
            }
          }

          resolve({ success, failed, errors: errors.slice(0, 10) }); // Return first 10 errors
        })
        .on('error', (error: Error) => {
          reject(new BadRequestException('Failed to parse CSV: ' + error.message));
        });
    });
  }
}
