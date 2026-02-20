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
export class LocationBasedAnalyticsDto {
  byState: Array<{
    state: string;
    collegeCount: number;
    studentCount: number;
    facultyCount: number;
    avgCompletionRate: number;
  }>;
  byCity: Array<{
    city: string;
    state: string;
    collegeCount: number;
    studentCount: number;
    facultyCount: number;
    avgCompletionRate: number;
  }>;
  byPincode: Array<{
    pincode: string;
    city: string;
    state: string;
    collegeCount: number;
    studentCount: number;
  }>;
}

export class DetailedStudentProgressDto {
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  collegeName: string;
  city: string;
  state: string;
  currentYear: number;
  currentSemester: number;
  status: string;
  
  academicProgress: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    notStartedCourses: number;
    completionRate: number;
  };
  
  practiceStats: {
    totalPracticeSessions: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    totalTimeSpent: number;
    avgSessionDuration: number;
  };
  
  testPerformance: {
    testsAttempted: number;
    testsCompleted: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
  };
  
  recentActivity: {
    lastLoginAt: Date | null;
    lastContentAccessAt: Date | null;
    daysActive: number;
  };
  
  courseDetails: Array<{
    courseId: string;
    courseTitle: string;
    facultyName: string;
    status: string;
    completedSteps: number;
    totalSteps: number;
    progress: number;
    startedAt: Date | null;
    completedAt: Date | null;
  }>;
}

export class WeeklyActivitySummaryDto {
  weekStartDate: string;
  weekEndDate: string;
  
  userActivity: {
    totalLogins: number;
    uniqueUsers: number;
    newUsers: number;
    avgSessionDuration: number;
  };
  
  contentActivity: {
    contentAccessed: number;
    coursesStarted: number;
    coursesCompleted: number;
    testsAttempted: number;
    practiceSessionsCompleted: number;
  };
  
  topActiveColleges: Array<{
    collegeName: string;
    activeUsers: number;
    contentAccessed: number;
  }>;
  
  topActiveStudents: Array<{
    studentName: string;
    collegeName: string;
    loginCount: number;
    contentAccessed: number;
  }>;
  
  securityEvents: {
    failedLoginAttempts: number;
    suspiciousActivities: number;
    blockedAccessAttempts: number;
  };
}