import { IsEnum, IsInt, IsOptional, IsString, IsBoolean, Min, Max, IsUUID } from 'class-validator';

export enum RatingType {
  COURSE = 'COURSE',
  TEACHER = 'TEACHER',
  CONTENT = 'CONTENT',
}

export class CreateRatingDto {
  @IsEnum(RatingType)
  ratingType: RatingType;

  @IsUUID()
  entityId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = true;
}

export class UpdateRatingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class RatingQueryDto {
  @IsOptional()
  @IsEnum(RatingType)
  ratingType?: RatingType;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  collegeId?: string;
}
