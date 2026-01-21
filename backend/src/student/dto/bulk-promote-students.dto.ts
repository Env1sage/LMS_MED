import { IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { AcademicYear } from '@prisma/client';

export class BulkPromoteStudentsDto {
  @IsArray()
  @IsNotEmpty()
  studentIds: string[];

  @IsEnum(AcademicYear)
  newAcademicYear: AcademicYear;
}
