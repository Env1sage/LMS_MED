export enum UserRole {
  BITFLOW_OWNER = 'BITFLOW_OWNER',
  PUBLISHER_ADMIN = 'PUBLISHER_ADMIN',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  COLLEGE_DEAN = 'COLLEGE_DEAN',
  COLLEGE_HOD = 'COLLEGE_HOD',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum CollegeStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum PublisherStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum CompetencyDomain {
  COGNITIVE = 'COGNITIVE',
  CLINICAL = 'CLINICAL',
  PRACTICAL = 'PRACTICAL',
}

export enum AcademicLevel {
  UG = 'UG',
  PG = 'PG',
  SPECIALIZATION = 'SPECIALIZATION',
}

export enum CompetencyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

// Updated Academic Year per CBME spec
export enum AcademicYear {
  YEAR_1 = 'YEAR_1',
  YEAR_2 = 'YEAR_2',
  YEAR_3_MINOR = 'YEAR_3_MINOR',
  YEAR_3_MAJOR = 'YEAR_3_MAJOR',
  INTERNSHIP = 'INTERNSHIP',
  // Legacy values (kept for backward compatibility)
  FIRST_YEAR = 'FIRST_YEAR',
  SECOND_YEAR = 'SECOND_YEAR',
  THIRD_YEAR = 'THIRD_YEAR',
  FOURTH_YEAR = 'FOURTH_YEAR',
  FIFTH_YEAR = 'FIFTH_YEAR',
}

// MCQ Types per CBME spec
export enum McqType {
  NORMAL = 'NORMAL',
  SCENARIO_BASED = 'SCENARIO_BASED',
  IMAGE_BASED = 'IMAGE_BASED',
}

// Package status
export enum PackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

// Package assignment status
export enum PackageAssignmentStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// Rating types
export enum RatingType {
  COURSE = 'COURSE',
  TEACHER = 'TEACHER',
  CONTENT = 'CONTENT',
}

// MCQ removed - MCQs are managed separately in MCQ Management
export enum LearningUnitType {
  BOOK = 'BOOK',
  VIDEO = 'VIDEO',
  NOTES = 'NOTES',
  MCQ = 'MCQ',
  HANDBOOK = 'HANDBOOK',
  PPT = 'PPT',
  DOCUMENT = 'DOCUMENT',
}

export enum DeliveryType {
  REDIRECT = 'REDIRECT',
  EMBED = 'EMBED',
  STREAM = 'STREAM',
}

// CBME Competency Levels (Miller's Pyramid)
export enum DifficultyLevel {
  K = 'K',           // Knows - Basic knowledge recall
  KH = 'KH',         // Knows How - Applied knowledge
  S = 'S',           // Shows - Can demonstrate in simulated setting
  SH = 'SH',         // Shows How - Can demonstrate competently
  P = 'P',           // Performs - Can perform independently
}

// Phase 3: Updated content status (ContentStatus in backend)
export enum LearningUnitStatus {
  DRAFT = 'DRAFT',
  PENDING_MAPPING = 'PENDING_MAPPING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Phase 3: Competency mapping status
export enum CompetencyMappingStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  COMPLETE = 'COMPLETE',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  collegeId?: string;
  publisherId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Publisher {
  id: string;
  name: string;
  code: string;
  status: PublisherStatus;
  createdAt: string;
  updatedAt: string;
  adminCount?: number;
  legalName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contractStartDate?: string;
  contractEndDate?: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  status: CollegeStatus;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  emailDomain?: string;
  adminContactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  contractEndDate?: string;
}

export interface SecurityPolicy {
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
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAnalytics {
  activeColleges: number;
  suspendedColleges: number;
  activePublishers: number;
  suspendedPublishers: number;
  totalUsers: number;
  activeUsers: number;
  totalLogins: number;
  failedLoginAttempts: number;
  dailyActiveUsers: Array<{
    date: string;
    count: number;
  }>;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
}

// Phase 2 - Dashboard Overview
export interface DashboardOverview {
  totalColleges: number;
  activeColleges: number;
  inactiveColleges: number;
  totalPublishers: number;
  activePublishers: number;
  expiredContractPublishers: number;
  totalUsers: number;
  facultyCount: number;
  studentCount: number;
  contentByType: {
    books: number;
    videos: number;
    mcqs: number;
  };
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  peakUsageHours: Array<{
    hour: number;
    loginCount: number;
  }>;
  loginTrends: Array<{
    date: string;
    successCount: number;
    failedCount: number;
  }>;
  competencyStats: {
    totalCompetencies: number;
    activeCompetencies: number;
    pendingContentTags: number;
  };
}

// Phase 2 - Activity Trends
export interface ActivityTrends {
  loginTrends: Array<{
    date: string;
    successCount: number;
    failedCount: number;
  }>;
  contentAccessTrends: Array<{
    date: string;
    accessCount: number;
  }>;
}

// Phase 2 - Publisher Details
export interface PublisherDetails extends Publisher {
  legalName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contentStats: {
    total: number;
    byType: Array<{
      type: string;
      count: number;
    }>;
    byStatus: Array<{
      status: string;
      count: number;
    }>;
  };
  competencyMappingStats: {
    totalContent: number;
    mappedCount: number;
    unmappedCount: number;
    mappingPercentage: number;
  };
  collegesUsingContent: Array<{
    id: string;
    name: string;
    contentCount: number;
  }>;
}

// Phase 2 - College Details
export interface CollegeDetails extends College {
  emailDomain?: string;
  adminContactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  departments: Array<{
    id: string;
    name: string;
    code: string;
    facultyCount: number;
    studentCount: number;
  }>;
  usageStats: {
    totalLogins: number;
    contentAccessed: number;
  };
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail?: string;
  userRole?: string;
  collegeId: string | null;
  collegeName?: string;
  publisherId: string | null;
  publisherName?: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Competency {
  id: string;
  code: string;
  title: string;
  description: string;
  subject: string;
  domain: CompetencyDomain;
  academicLevel: AcademicLevel;
  status: CompetencyStatus;
  version: number;
  deprecatedAt: string | null;
  replacedBy: string | null;
  createdBy: string;
  reviewedBy: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetencyStats {
  total: number;
  active: number;
  draft: number;
  deprecated: number;
  uniqueSubjects: number;
}

export interface CompetenciesResponse {
  data: Competency[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
export interface LearningUnit {
  id: string;
  publisherId: string;
  type: LearningUnitType;
  title: string;
  description: string;
  subject: string;
  topic: string;
  subTopic?: string;
  difficultyLevel: DifficultyLevel;
  estimatedDuration: number;
  competencyIds: string[];
  competencies?: Competency[];
  secureAccessUrl: string;
  deliveryType: DeliveryType;
  watermarkEnabled: boolean;
  sessionExpiryMinutes: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  maxAttempts?: number;
  timeLimit?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  status: LearningUnitStatus;
  // Phase 3: Content lifecycle fields
  competencyMappingStatus?: CompetencyMappingStatus;
  activatedAt?: string;
  activatedBy?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
  // Phase 3: Content protection fields
  viewOnly?: boolean;
  downloadAllowed?: boolean;
  totalAccesses?: number;
  uniqueUsers?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningUnitsResponse {
  data: LearningUnit[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LearningUnitStats {
  total: number;
  byType: Record<LearningUnitType, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byStatus: Record<LearningUnitStatus, number>;
}

export interface LearningUnitAnalytics {
  totalAccesses: number;
  uniqueUsers: number;
  averageDuration: number;
  popularUnits: Array<{
    id: string;
    title: string;
    type: LearningUnitType;
    accessCount: number;
  }>;
}

// Phase 2 - Subject Popularity
export interface SubjectPopularity {
  subjects: Array<{
    subject: string;
    contentCount: number;
    accessCount: number;
    competencyCount: number;
  }>;
}

// Phase 2 - Course Completion Stats
export interface CourseCompletionStats {
  overallCompletionRate: number;
  completionByCollege: Array<{
    collegeId: string;
    collegeName: string;
    completionRate: number;
    totalCourses: number;
    completedCourses: number;
  }>;
}

// Phase 2 - Assessment Participation
export interface AssessmentParticipation {
  totalAssessments: number;
  totalAttempts: number;
  participationRate: number;
  assessmentsByType: Array<{
    type: string;
    count: number;
    attempts: number;
    participationRate: number;
  }>;
  participationByCollege: Array<{
    collegeId: string;
    collegeName: string;
    totalAssignments: number;
    attempted: number;
    participationRate: number;
  }>;
}