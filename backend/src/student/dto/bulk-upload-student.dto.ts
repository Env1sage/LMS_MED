import { IsEmail, IsInt, IsNotEmpty, IsString, Min, Max, IsEnum } from 'class-validator';
import { AcademicYear } from '@prisma/client';

export class BulkUploadStudentDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsEmail()
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
}

export class BulkUploadResultDto {
  success: number;
  failed: number;
  errors: { row: number; email: string; error: string }[];
  createdStudents: { fullName: string; email: string; tempPassword: string }[];
  emailsSent: number;
  emailsFailed: number;
}
