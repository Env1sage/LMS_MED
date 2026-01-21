import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum BloomsLevel {
  REMEMBER = 'REMEMBER',
  UNDERSTAND = 'UNDERSTAND',
  APPLY = 'APPLY',
  ANALYZE = 'ANALYZE',
  EVALUATE = 'EVALUATE',
  CREATE = 'CREATE',
}

export enum McqStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export class CreateMcqDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsString()
  questionImage?: string;

  @IsString()
  @IsNotEmpty()
  optionA: string;

  @IsString()
  @IsNotEmpty()
  optionB: string;

  @IsString()
  @IsNotEmpty()
  optionC: string;

  @IsString()
  @IsNotEmpty()
  optionD: string;

  @IsOptional()
  @IsString()
  optionE?: string;

  @IsString()
  @IsNotEmpty()
  correctAnswer: string; // Should be one of: A, B, C, D, E

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  explanationImage?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsEnum(BloomsLevel)
  bloomsLevel: BloomsLevel;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competencyIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateMcqDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  questionImage?: string;

  @IsOptional()
  @IsString()
  optionA?: string;

  @IsOptional()
  @IsString()
  optionB?: string;

  @IsOptional()
  @IsString()
  optionC?: string;

  @IsOptional()
  @IsString()
  optionD?: string;

  @IsOptional()
  @IsString()
  optionE?: string;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  explanationImage?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsEnum(BloomsLevel)
  bloomsLevel?: BloomsLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true})
  competencyIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(McqStatus)
  status?: McqStatus;
}

export class GetMcqsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsEnum(McqStatus)
  status?: McqStatus;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competencyIds?: string[];
}

export class VerifyMcqDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class McqResponseDto {
  id: string;
  question: string;
  questionImage?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation?: string;
  explanationImage?: string;
  subject: string;
  topic: string;
  difficultyLevel: string;
  bloomsLevel: string;
  competencyIds: string[];
  tags: string[];
  year?: number;
  source?: string;
  status: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  usageCount: number;
  correctRate: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class McqStatsDto {
  total: number;
  byStatus: Record<string, number>;
  bySubject: Record<string, number>;
  byDifficulty: Record<string, number>;
  verified: number;
  unverified: number;
}
