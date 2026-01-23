import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

// DTO for updating publisher profile - only editable fields
export class UpdatePublisherProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  physicalAddress?: string;
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
  contactPerson: string | null;
  contactEmail: string | null;
  physicalAddress: string | null;

  // Read-only fields
  publisherCode: string;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  status: string;
  legalName: string | null;
  createdAt: Date;
}
