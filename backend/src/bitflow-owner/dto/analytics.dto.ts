import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum AnalyticsPeriod {
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_90_DAYS = 'LAST_90_DAYS',
  CUSTOM = 'CUSTOM',
}

export class GetAnalyticsDto {
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period?: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class PlatformAnalyticsResponseDto {
  // Aggregated counts (Non-PII)
  activeColleges: number;
  suspendedColleges: number;
  activePublishers: number;
  suspendedPublishers: number;
  expiredPublishers: number;
  totalUsers: number;
  activeUsers: number; // Users who logged in during period
  
  // Usage metrics
  totalLogins: number;
  failedLoginAttempts: number;
  
  // Time-series data
  dailyActiveUsers: Array<{
    date: string;
    count: number;
  }>;
  
  // Role distribution (aggregated)
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
}

// Phase 2: Enhanced analytics DTOs
export class DashboardOverviewDto {
  // Platform KPIs
  totalColleges: number;
  activeColleges: number;
  inactiveColleges: number;
  
  totalPublishers: number;
  activePublishers: number;
  expiredContractPublishers: number;
  
  totalUsers: number;
  facultyCount: number;
  studentCount: number;
  
  // Content metrics (aggregated by type)
  contentByType: {
    books: number;
    notes: number;
    mcqs: number;
    videos: number;
  };
  
  // Activity metrics
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  
  // Peak usage windows
  peakUsageHours: Array<{
    hour: number;
    loginCount: number;
  }>;
}

export class ActivityTrendsDto {
  loginTrends: Array<{
    date: string;
    successfulLogins: number;
    failedLogins: number;
  }>;
  
  contentAccessTrends: Array<{
    date: string;
    accessCount: number;
  }>;
  
  testParticipationTrends: Array<{
    date: string;
    testsAttempted: number;
    testsCompleted: number;
  }>;
}

export class SubjectPopularityDto {
  subjects: Array<{
    subject: string;
    contentCount: number;
    accessCount: number;
    competencyCount: number;
  }>;
}

export class CourseCompletionStatsDto {
  overallCompletionRate: number;
  completionByCollege: Array<{
    collegeId: string;
    collegeName: string;
    completionRate: number;
    totalCourses: number;
    completedCourses: number;
  }>;
}
