import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AcademicYear, LearningUnitType } from '@prisma/client';

export class LearningFlowStepDto {
  @IsString()
  @IsNotEmpty()
  learningUnitId: string;

  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsEnum(LearningUnitType)
  stepType: LearningUnitType;

  @IsBoolean()
  mandatory: boolean;

  @IsOptional()
  completionCriteria?: {
    videoMinWatchPercent?: number;
    bookMinReadDuration?: number;
    requiredScrollPercent?: number;
  };
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AcademicYear)
  academicYear: AcademicYear;

  @IsArray()
  @IsOptional()
  competencyIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningFlowStepDto)
  learningFlowSteps: LearningFlowStepDto[];
}
