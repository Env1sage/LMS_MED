import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

// DTO for updating publisher profile - only editable fields
export class UpdatePublisherProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for changing password
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

// Response DTO for publisher profile
export class PublisherProfileResponseDto {
  // Editable fields
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  logoUrl: string | null;

  // Read-only fields
  publisherCode: string;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  status: string;
  createdAt: Date;
}
