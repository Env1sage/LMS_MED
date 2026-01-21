import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { AssignmentType } from '@prisma/client';

export class AssignCourseDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsEnum(AssignmentType)
  assignmentType: AssignmentType;

  @IsArray()
  @IsString({ each: true })
  studentIds: string[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
