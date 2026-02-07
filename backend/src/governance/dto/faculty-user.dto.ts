import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateFacultyUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @IsUUID()
  @IsNotEmpty()
  permissionSetId: string;
}
