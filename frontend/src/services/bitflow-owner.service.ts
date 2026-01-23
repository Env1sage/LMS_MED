import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api';
import {
  Publisher,
  College,
  SecurityPolicy,
  PlatformAnalytics,
  AuditLogsResponse,
  PublisherStatus,
  CollegeStatus,
  DashboardOverview,
  ActivityTrends,
  PublisherDetails,
  CollegeDetails,
  SubjectPopularity,
  CourseCompletionStats,
  AssessmentParticipation,
} from '../types';

class BitflowOwnerService {
  // Publisher Management
  async getAllPublishers(): Promise<Publisher[]> {
    const response = await apiService.get<Publisher[]>(API_ENDPOINTS.PUBLISHERS);
    return response.data;
  }

  async getPublisherById(id: string): Promise<Publisher> {
    const response = await apiService.get<Publisher>(API_ENDPOINTS.PUBLISHER_BY_ID(id));
    return response.data;
  }

  async createPublisher(data: {
    name: string;
    code: string;
    legalName?: string;
    contactPerson?: string;
    contactEmail?: string;
    contractStartDate?: string;
    contractEndDate?: string;
  }): Promise<Publisher> {
    // Filter out empty strings
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '')
    );
    const response = await apiService.post<Publisher>(API_ENDPOINTS.PUBLISHERS, payload);
    return response.data;
  }

  async updatePublisherStatus(id: string, status: PublisherStatus): Promise<Publisher> {
    const response = await apiService.patch<Publisher>(
      API_ENDPOINTS.PUBLISHER_STATUS(id),
      { status }
    );
    return response.data;
  }

  // College Management
  async getAllColleges(): Promise<College[]> {
    const response = await apiService.get<College[]>(API_ENDPOINTS.COLLEGES);
    return response.data;
  }

  async getCollegeById(id: string): Promise<College> {
    const response = await apiService.get<College>(API_ENDPOINTS.COLLEGE_BY_ID(id));
    return response.data;
  }

  async createCollege(data: {
    name: string;
    code: string;
    emailDomain?: string;
    adminContactEmail?: string;
    address?: string;
    city?: string;
    state?: string;
  }): Promise<College> {
    // Filter out empty strings
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '')
    );
    const response = await apiService.post<College>(API_ENDPOINTS.COLLEGES, payload);
    return response.data;
  }

  async updateCollegeStatus(id: string, status: CollegeStatus): Promise<College> {
    const response = await apiService.patch<College>(
      API_ENDPOINTS.COLLEGE_STATUS(id),
      { status }
    );
    return response.data;
  }

  // Security Policy & Feature Flags
  async getSecurityPolicy(): Promise<SecurityPolicy> {
    const response = await apiService.get<SecurityPolicy>(API_ENDPOINTS.SECURITY_POLICY);
    return response.data;
  }

  async updateSecurityPolicy(data: Partial<SecurityPolicy>): Promise<SecurityPolicy> {
    const response = await apiService.patch<SecurityPolicy>(
      API_ENDPOINTS.SECURITY_POLICY,
      data
    );
    return response.data;
  }

  async updateFeatureFlags(flags: {
    publisherPortalEnabled?: boolean;
    facultyPortalEnabled?: boolean;
    studentPortalEnabled?: boolean;
    mobileAppEnabled?: boolean;
  }): Promise<SecurityPolicy> {
    const response = await apiService.patch<SecurityPolicy>(
      API_ENDPOINTS.FEATURE_FLAGS,
      flags
    );
    return response.data;
  }

  // Analytics
  async getPlatformAnalytics(period: string = 'LAST_30_DAYS'): Promise<PlatformAnalytics> {
    const response = await apiService.get<PlatformAnalytics>(API_ENDPOINTS.ANALYTICS, {
      params: { period },
    });
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(params: {
    collegeId?: string;
    publisherId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> {
    const response = await apiService.get<AuditLogsResponse>(
      API_ENDPOINTS.AUDIT_LOGS,
      { params }
    );
    return response.data;
  }

  // Phase 2 - Dashboard Overview
  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await apiService.get<DashboardOverview>(API_ENDPOINTS.DASHBOARD);
    return response.data;
  }

  // Phase 2 - Activity Trends
  async getActivityTrends(period: string = 'LAST_30_DAYS'): Promise<ActivityTrends> {
    const response = await apiService.get<ActivityTrends>(API_ENDPOINTS.ACTIVITY_TRENDS, {
      params: { period },
    });
    return response.data;
  }

  // Phase 2 - Publisher Details
  async getPublisherDetails(id: string): Promise<PublisherDetails> {
    const response = await apiService.get<PublisherDetails>(API_ENDPOINTS.PUBLISHER_DETAILS(id));
    return response.data;
  }

  // Phase 2 - Update Publisher
  async updatePublisher(id: string, data: {
    name?: string;
    legalName?: string;
    contactPerson?: string;
    contactEmail?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    contractDocument?: string;
  }): Promise<Publisher> {
    const response = await apiService.put<Publisher>(
      API_ENDPOINTS.PUBLISHER_BY_ID(id),
      data
    );
    return response.data;
  }

  // Phase 2 - College Details
  async getCollegeDetails(id: string): Promise<CollegeDetails> {
    const response = await apiService.get<CollegeDetails>(API_ENDPOINTS.COLLEGE_DETAILS(id));
    return response.data;
  }

  // Phase 2 - Update College
  async updateCollege(id: string, data: {
    name?: string;
    emailDomain?: string;
    adminContactEmail?: string;
    address?: string;
    city?: string;
    state?: string;
  }): Promise<College> {
    const response = await apiService.put<College>(
      API_ENDPOINTS.COLLEGE_BY_ID(id),
      data
    );
    return response.data;
  }

  // Phase 2 - Check Expired Contracts
  async checkExpiredContracts(): Promise<{ expiredCount: number; expiredPublishers: string[] }> {
    const response = await apiService.post<{ expiredCount: number; expiredPublishers: string[] }>(
      API_ENDPOINTS.CHECK_EXPIRED_CONTRACTS
    );
    return response.data;
  }

  // Phase 2 - Subject Popularity
  async getSubjectPopularity(): Promise<SubjectPopularity> {
    const response = await apiService.get<SubjectPopularity>(API_ENDPOINTS.SUBJECT_POPULARITY);
    return response.data;
  }

  // Phase 2 - Course Completion Stats
  async getCourseCompletionStats(): Promise<CourseCompletionStats> {
    const response = await apiService.get<CourseCompletionStats>(API_ENDPOINTS.COURSE_COMPLETION);
    return response.data;
  }

  // Phase 2 - Assessment Participation
  async getAssessmentParticipation(): Promise<AssessmentParticipation> {
    const response = await apiService.get<AssessmentParticipation>(API_ENDPOINTS.ASSESSMENT_PARTICIPATION);
    return response.data;
  }

  // ========================================================================
  // CONTENT MANAGEMENT
  // ========================================================================

  async getAllContent(params: {
    type?: string;
    publisherId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ContentListResponse> {
    const response = await apiService.get<ContentListResponse>('/bitflow-owner/content', { params });
    return response.data;
  }

  async getContentStats(): Promise<ContentStats> {
    const response = await apiService.get<ContentStats>('/bitflow-owner/content/stats');
    return response.data;
  }

  async getContentById(id: string): Promise<ContentItem> {
    const response = await apiService.get<ContentItem>(`/bitflow-owner/content/${id}`);
    return response.data;
  }

  async updateContentStatus(id: string, status: string, reason?: string): Promise<ContentItem> {
    const response = await apiService.patch<ContentItem>(
      `/bitflow-owner/content/${id}/status`,
      { status, reason }
    );
    return response.data;
  }

  async getAllMcqs(params: {
    publisherId?: string;
    status?: string;
    subject?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<McqListResponse> {
    const response = await apiService.get<McqListResponse>('/bitflow-owner/mcqs', { params });
    return response.data;
  }

  async getMcqById(id: string): Promise<McqItem> {
    const response = await apiService.get<McqItem>(`/bitflow-owner/mcqs/${id}`);
    return response.data;
  }
}

// Content Types
export interface ContentItem {
  id: string;
  type: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  subTopic?: string;
  difficultyLevel: string;
  estimatedDuration: number;
  status: string;
  competencyMappingStatus: string;
  thumbnailUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publisher: { id: string; name: string; code: string };
  competencies?: { id: string; code: string; shortTitle: string; domain: string }[];
}

export interface ContentListResponse {
  data: ContentItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContentStats {
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPublisher: { publisherId: string; publisherName: string; count: number }[];
  recentContent: {
    id: string;
    type: string;
    title: string;
    subject: string;
    status: string;
    createdAt: string;
    publisherName: string;
  }[];
}

export interface McqItem {
  id: string;
  questionText: string;
  subject: string;
  topic: string;
  difficultyLevel: string;
  bloomsLevel: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  publisher: { id: string; name: string; code: string };
  competencies?: { id: string; code: string; shortTitle: string; domain: string }[];
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
}

export interface McqListResponse {
  data: McqItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default new BitflowOwnerService();
