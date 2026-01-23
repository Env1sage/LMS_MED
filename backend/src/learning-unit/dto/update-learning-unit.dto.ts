import { IsString, IsEnum, IsInt, Min, IsBoolean, IsOptional, IsArray, IsUrl } from 'class-validator';
import { DeliveryType, DifficultyLevel, ContentStatus } from '@prisma/client';

export class UpdateLearningUnitDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  subTopic?: string;

  @IsEnum(DifficultyLevel)
  @IsOptional()
  difficultyLevel?: DifficultyLevel;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDuration?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competencyIds?: string[];

  @IsUrl()
  @IsOptional()
  secureAccessUrl?: string;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @IsBoolean()
  @IsOptional()
  watermarkEnabled?: boolean;

  @IsInt()
  @Min(5)
  @IsOptional()
  sessionExpiryMinutes?: number;

  @IsInt()
  @IsOptional()
  maxAttempts?: number;

  @IsInt()
  @IsOptional()
  timeLimit?: number;

  // Phase 3: Content Protection fields
  @IsBoolean()
  @IsOptional()
  viewOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  downloadAllowed?: boolean;

  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;
}
