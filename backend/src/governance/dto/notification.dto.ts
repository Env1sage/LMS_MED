import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, MinLength, MaxLength } from 'class-validator';

export enum NotificationType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  SCHEDULE_CHANGE = 'SCHEDULE_CHANGE',
  ACADEMIC_NOTICE = 'ACADEMIC_NOTICE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationAudience {
  ALL = 'ALL',
  FACULTY = 'FACULTY',
  STUDENTS = 'STUDENTS',
  DEPARTMENT = 'DEPARTMENT',
  BATCH = 'BATCH',
}

export class CreateNotificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.ANNOUNCEMENT;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @IsEnum(NotificationAudience)
  @IsOptional()
  audience?: NotificationAudience = NotificationAudience.ALL;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateNotificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @IsOptional()
  message?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class QueryNotificationDto {
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
