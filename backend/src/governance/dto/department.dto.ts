import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DepartmentStatus } from '../../common/enums';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(DepartmentStatus)
  @IsOptional()
  status?: DepartmentStatus;
}

export class AssignHodDto {
  @IsString()
  @IsNotEmpty()
  hodId: string;
}
