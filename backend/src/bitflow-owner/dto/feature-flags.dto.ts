import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  enablePublisherSelfRegistration?: boolean;

  @IsBoolean()
  @IsOptional()
  enableStudentSelfRegistration?: boolean;

  @IsBoolean()
  @IsOptional()
  enableContentAutoApproval?: boolean;

  @IsBoolean()
  @IsOptional()
  enableAnalyticsDashboard?: boolean;

  @IsBoolean()
  @IsOptional()
  enableAuditLogs?: boolean;

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;
}

export class UpdateSecurityPolicyDto {
  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  @IsInt()
  @IsOptional()
  tokenExpiryMinutes?: number;

  @IsInt()
  @IsOptional()
  refreshTokenExpiryDays?: number;

  @IsInt()
  @IsOptional()
  maxConcurrentSessions?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20)
  maxLoginAttempts?: number;

  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(1440)
  lockoutDurationMinutes?: number;

  @IsInt()
  @IsOptional()
  @Min(6)
  @Max(32)
  passwordMinLength?: number;

  @IsBoolean()
  @IsOptional()
  passwordRequireUppercase?: boolean;

  @IsBoolean()
  @IsOptional()
  passwordRequireNumbers?: boolean;

  @IsBoolean()
  @IsOptional()
  passwordRequireSpecialChars?: boolean;

  @IsBoolean()
  @IsOptional()
  mfaEnabled?: boolean;

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
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  mfaEnabled: boolean;
  watermarkEnabled: boolean;
  screenshotPrevention: boolean;
  publisherPortalEnabled: boolean;
  facultyPortalEnabled: boolean;
  studentPortalEnabled: boolean;
  mobileAppEnabled: boolean;
  enablePublisherSelfRegistration: boolean;
  enableStudentSelfRegistration: boolean;
  enableContentAutoApproval: boolean;
  enableAnalyticsDashboard: boolean;
  enableAuditLogs: boolean;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}
