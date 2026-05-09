import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { AcademicYear } from '@prisma/client';

export enum SelfPacedResourceType {
  NOTE = 'NOTE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  REFERENCE = 'REFERENCE',
  PRACTICE = 'PRACTICE',
  MCQ = 'MCQ',
  HANDBOOK = 'HANDBOOK',
  LECTURE_NOTES = 'LECTURE_NOTES',
  CASE_STUDY = 'CASE_STUDY',
}

export class CreateSelfPacedResourceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SelfPacedResourceType)
  resourceType: SelfPacedResourceType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsEnum(AcademicYear)
  academicYear?: AcademicYear;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competencyIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateSelfPacedResourceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsEnum(AcademicYear)
  academicYear?: AcademicYear;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competencyIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SelfPacedResourceResponseDto {
  id: string;
  facultyId: string;
  facultyName: string;
  title: string;
  description?: string;
  resourceType: SelfPacedResourceType;
  fileUrl?: string;
  content?: string;
  subject?: string;
  topicId?: string;
  academicYear?: AcademicYear;
  competencyIds: string[];
  tags: string[];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SelfPacedAccessLogDto {
  resourceId: string;
  timeSpent?: number;
}
