import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { AcademicYear, StudentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryStudentDto {
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsEnum(AcademicYear)
  currentAcademicYear?: AcademicYear;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
