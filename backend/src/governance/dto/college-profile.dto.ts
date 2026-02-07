import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateCollegeProfileDto {
  @IsEmail()
  @IsOptional()
  adminContactEmail?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;
}
