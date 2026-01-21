import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsArray, IsUrl, MinLength } from 'class-validator';
import { LearningUnitType, DeliveryType, DifficultyLevel } from '@prisma/client';

export class CreateLearningUnitDto {
  @IsEnum(LearningUnitType)
  type: LearningUnitType;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  subTopic?: string;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsInt()
  @Min(1)
  estimatedDuration: number; // in minutes

  @IsArray()
  @IsString({ each: true })
  competencyIds: string[]; // Array of competency UUIDs

  @IsUrl()
  secureAccessUrl: string; // External URL (publisher-hosted)

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsBoolean()
  @IsOptional()
  watermarkEnabled?: boolean;

  @IsInt()
  @Min(5)
  @IsOptional()
  sessionExpiryMinutes?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts?: number; // For MCQs

  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimit?: number; // For MCQs (minutes)

  @IsOptional()
  @IsUrl({}, { message: 'thumbnailUrl must be a valid URL' })
  thumbnailUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
