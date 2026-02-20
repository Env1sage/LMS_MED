import { IsString, IsEnum, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional, IsEmail } from 'class-validator';
import { CollegeStatus } from '@prisma/client';

export class CreateCollegeDto {
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

  // Phase 2: Enhanced college metadata
  @IsString()
  @IsOptional()
  emailDomain?: string;

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

  @IsString()
  @IsOptional()
  taluka?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}

export class UpdateCollegeDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  emailDomain?: string;

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

  @IsString()
  @IsOptional()
  taluka?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}

export class UpdateCollegeStatusDto {
  @IsEnum(CollegeStatus)
  status: CollegeStatus;
}

export class CollegeResponseDto {
  id: string;
  name: string;
  code: string;
  status: CollegeStatus;
  emailDomain?: string | null;
  adminContactEmail?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  taluka?: string | null;
  pincode?: string | null;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
  
  // Returned only on college creation
  createdAccounts?: {
    itAdmin: { email: string; role: string };
    dean: { email: string; role: string };
    defaultPassword: string;
  };
}

export class CollegeDetailResponseDto extends CollegeResponseDto {
  departmentCount: number;
  facultyCount: number;
  studentCount: number;
  courseCount: number;
  departments: Array<{
    id: string;
    name: string;
    code: string;
    hodName: string | null;
    facultyCount: number;
    studentCount: number;
  }>;
  usageStats: {
    activeUsersLast7Days: number;
    activeUsersLast30Days: number;
    totalLogins: number;
    courseCompletionRate: number;
  };
}
