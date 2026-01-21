import { IsString, IsOptional, IsEnum, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CompetencyDomain, AcademicLevel, CompetencyStatus } from '@prisma/client';

export class QueryCompetencyDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsEnum(CompetencyDomain)
  domain?: CompetencyDomain;

  @IsOptional()
  @IsEnum(AcademicLevel)
  academicLevel?: AcademicLevel;

  @IsOptional()
  @IsEnum(CompetencyStatus)
  status?: CompetencyStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['code', 'title', 'subject', 'domain', 'academicLevel', 'createdAt', 'status'])
  sortBy?: string = 'code';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 5000;
}
