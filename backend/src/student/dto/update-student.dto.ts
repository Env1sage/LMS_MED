import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { AcademicYear, StudentStatus } from '@prisma/client';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  yearOfAdmission?: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  expectedPassingYear?: number;

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @IsEnum(AcademicYear)
  @IsOptional()
  currentAcademicYear?: AcademicYear;
}
