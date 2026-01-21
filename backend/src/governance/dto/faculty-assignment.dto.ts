import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';
import { FacultyStatus } from '../../common/enums';

export class AssignFacultyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subjects?: string[];
}

export class UpdateFacultyAssignmentDto {
  @IsString()
  @IsOptional()
  permissionId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subjects?: string[];

  @IsEnum(FacultyStatus)
  @IsOptional()
  status?: FacultyStatus;
}

export class RemoveFacultyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;
}
