import { IsString, IsOptional, IsEnum, IsNotEmpty, IsArray, IsDateString, IsUUID } from 'class-validator';
import { PackageStatus, PackageAssignmentStatus, LearningUnitType } from '@prisma/client';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  publisherId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(LearningUnitType, { each: true })
  contentTypes?: LearningUnitType[];

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(LearningUnitType, { each: true })
  contentTypes?: LearningUnitType[];

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;
}

export class AssignPackageToCollegeDto {
  @IsNotEmpty()
  @IsUUID()
  packageId: string;

  @IsNotEmpty()
  @IsUUID()
  collegeId: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdatePackageAssignmentDto {
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PackageAssignmentStatus)
  status?: PackageAssignmentStatus;
}
