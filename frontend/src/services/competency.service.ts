import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { 
  Competency, 
  CompetenciesResponse, 
  CompetencyStats,
  CompetencyDomain,
  AcademicLevel,
  CompetencyStatus
} from '../types';

export interface CreateCompetencyData {
  code: string;
  title: string;
  description: string;
  subject: string;
  domain: CompetencyDomain;
  academicLevel: AcademicLevel;
}

export interface QueryCompetencyParams {
  subject?: string;
  domain?: CompetencyDomain;
  academicLevel?: AcademicLevel;
  status?: CompetencyStatus;
  search?: string;
  sortBy?: 'code' | 'title' | 'subject' | 'domain' | 'academicLevel' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class CompetencyService {
  /**
   * Create a new competency (BITFLOW_OWNER only)
   */
  async create(data: CreateCompetencyData): Promise<Competency> {
    const response = await apiService.post(API_ENDPOINTS.COMPETENCIES, data);
    return response.data;
  }

  /**
   * Get all competencies with filtering
   */
  async getAll(params?: QueryCompetencyParams): Promise<CompetenciesResponse> {
    const response = await apiService.get(API_ENDPOINTS.COMPETENCIES, { params });
    return response.data;
  }

  /**
   * Get competency by ID
   */
  async getById(id: string): Promise<Competency> {
    const response = await apiService.get(`${API_ENDPOINTS.COMPETENCIES}/${id}`);
    return response.data;
  }

  /**
   * Review competency (add reviewer)
   */
  async review(id: string, reviewedBy: string): Promise<Competency> {
    const response = await apiService.patch(`${API_ENDPOINTS.COMPETENCIES}/${id}`, {
      reviewedBy,
    });
    return response.data;
  }

  /**
   * Activate a competency (makes it immutable)
   */
  async activate(id: string): Promise<Competency> {
    const response = await apiService.patch(`${API_ENDPOINTS.COMPETENCIES}/${id}/activate`);
    return response.data;
  }

  /**
   * Deprecate a competency
   */
  async deprecate(id: string, replacedBy?: string): Promise<Competency> {
    const response = await apiService.patch(`${API_ENDPOINTS.COMPETENCIES}/${id}/deprecate`, {
      replacedBy,
    });
    return response.data;
  }

  /**
   * Get available subjects
   */
  async getSubjects(): Promise<Array<{ subject: string; count: number }>> {
    const response = await apiService.get(`${API_ENDPOINTS.COMPETENCIES}/subjects`);
    return response.data;
  }

  /**
   * Get competency statistics
   */
  async getStats(): Promise<CompetencyStats> {
    const response = await apiService.get(`${API_ENDPOINTS.COMPETENCIES}/stats`);
    return response.data;
  }
}

export default new CompetencyService();
