import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ContentStatus, AcademicYear } from '@prisma/client';

export class CreateTopicDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AcademicYear)
  academicYear?: AcademicYear;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AcademicYear)
  academicYear?: AcademicYear;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class SearchTopicsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsEnum(AcademicYear)
  academicYear?: AcademicYear;
}
