import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { AuditAction } from '@prisma/client';

export class GetAuditLogsDto {
  @IsString()
  @IsOptional()
  collegeId?: string;

  @IsString()
  @IsOptional()
  publisherId?: string;

  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @IsString()
  @IsOptional()
  userRole?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 50;
}

export class AuditLogResponseDto {
  id: string;
  userId: string | null;
  userEmail?: string;
  userRole?: string;
  collegeId: string | null;
  collegeName?: string;
  publisherId: string | null;
  publisherName?: string;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

export class AuditLogsResponseDto {
  logs: AuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
