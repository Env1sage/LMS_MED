import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFeatureFlagsDto {
  @IsBoolean()
  @IsOptional()
  publisherPortalEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  facultyPortalEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  studentPortalEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  mobileAppEnabled?: boolean;
}

export class UpdateSecurityPolicyDto {
  @IsOptional()
  sessionTimeoutMinutes?: number;

  @IsOptional()
  tokenExpiryMinutes?: number;

  @IsOptional()
  refreshTokenExpiryDays?: number;

  @IsOptional()
  maxConcurrentSessions?: number;

  @IsBoolean()
  @IsOptional()
  watermarkEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  screenshotPrevention?: boolean;
}

export class SecurityPolicyResponseDto {
  id: string;
  sessionTimeoutMinutes: number;
  tokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  maxConcurrentSessions: number;
  watermarkEnabled: boolean;
  screenshotPrevention: boolean;
  publisherPortalEnabled: boolean;
  facultyPortalEnabled: boolean;
  studentPortalEnabled: boolean;
  mobileAppEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
