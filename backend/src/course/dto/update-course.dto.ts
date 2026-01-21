import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AcademicYear, CourseStatus } from '@prisma/client';
import { LearningFlowStepDto } from './create-course.dto';

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AcademicYear)
  @IsOptional()
  academicYear?: AcademicYear;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsArray()
  @IsOptional()
  competencyIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningFlowStepDto)
  @IsOptional()
  learningFlowSteps?: LearningFlowStepDto[];
}
