import { IsString, IsInt, IsEnum, IsNotEmpty, Min, Max, IsOptional } from 'class-validator';
import { AcademicYear } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  yearOfAdmission: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  expectedPassingYear: number;

  @IsEnum(AcademicYear)
  currentAcademicYear: AcademicYear;

  @IsString()
  @IsOptional()
  temporaryPassword?: string;
}
