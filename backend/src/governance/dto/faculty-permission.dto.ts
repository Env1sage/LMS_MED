import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateFacultyPermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  canCreateCourses?: boolean;

  @IsBoolean()
  @IsOptional()
  canEditCourses?: boolean;

  @IsBoolean()
  @IsOptional()
  canDeleteCourses?: boolean;

  @IsBoolean()
  @IsOptional()
  canCreateMcqs?: boolean;

  @IsBoolean()
  @IsOptional()
  canEditMcqs?: boolean;

  @IsBoolean()
  @IsOptional()
  canDeleteMcqs?: boolean;

  @IsBoolean()
  @IsOptional()
  canViewAnalytics?: boolean;

  @IsBoolean()
  @IsOptional()
  canAssignStudents?: boolean;

  @IsBoolean()
  @IsOptional()
  canScheduleLectures?: boolean;

  @IsBoolean()
  @IsOptional()
  canUploadNotes?: boolean;
}

export class UpdateFacultyPermissionDto extends CreateFacultyPermissionDto {}
