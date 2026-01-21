import { IsString, IsEnum, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional, IsDateString, IsEmail } from 'class-validator';
import { PublisherStatus } from '@prisma/client';

export class CreatePublisherDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code must be uppercase alphanumeric with underscores' })
  code: string;

  // Phase 2: Contract management fields
  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @IsDateString()
  @IsOptional()
  contractEndDate?: string;
}

export class UpdatePublisherDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @IsString()
  @IsOptional()
  contractDocument?: string;
}

export class UpdatePublisherStatusDto {
  @IsEnum(PublisherStatus)
  status: PublisherStatus;
}

export class PublisherResponseDto {
  id: string;
  name: string;
  code: string;
  status: PublisherStatus;
  legalName?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
  contractDocument?: string | null;
  createdAt: Date;
  updatedAt: Date;
  adminCount?: number;
  contentCount?: number;
  isContractExpired?: boolean;
}

export class PublisherDetailResponseDto extends PublisherResponseDto {
  contentStats: {
    books: number;
    videos: number;
    mcqs: number;
    notes: number;
  };
  competencyMappingStats: {
    complete: number;
    partial: number;
    pending: number;
  };
  collegesUsingContent: number;
}
