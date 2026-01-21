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

  async createPublisher(name: string, code: string): Promise<Publisher> {
    const response = await apiService.post<Publisher>(API_ENDPOINTS.PUBLISHERS, {
      name,
      code,
    });
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

  async createCollege(name: string, code: string): Promise<College> {
    const response = await apiService.post<College>(API_ENDPOINTS.COLLEGES, {
      name,
      code,
    });
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
}

export default new BitflowOwnerService();
