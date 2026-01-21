import apiService from './api.service';
import {
  LearningUnit,
  LearningUnitsResponse,
  LearningUnitStats,
  LearningUnitAnalytics,
  LearningUnitType,
  LearningUnitStatus,
  DeliveryType,
  DifficultyLevel,
} from '../types';

export interface CreateLearningUnitDto {
  type: LearningUnitType;
  title: string;
  description: string;
  subject: string;
  topic: string;
  subTopic?: string;
  difficultyLevel: DifficultyLevel;
  estimatedDuration: number;
  competencyIds: string[];
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
}

export interface UpdateLearningUnitDto extends Partial<CreateLearningUnitDto> {}

export interface QueryLearningUnitsDto {
  page?: number;
  limit?: number;
  subject?: string;
  topic?: string;
  type?: LearningUnitType;
  difficultyLevel?: DifficultyLevel;
  competencyId?: string;
  status?: LearningUnitStatus;
  search?: string;
}

const learningUnitService = {
  create: async (data: CreateLearningUnitDto): Promise<LearningUnit> => {
    const response = await apiService.post<LearningUnit>('/learning-units', data);
    return response.data;
  },

  getAll: async (params?: QueryLearningUnitsDto): Promise<LearningUnitsResponse> => {
    const response = await apiService.get<LearningUnitsResponse>('/learning-units', { params });
    return response.data;
  },

  getById: async (id: string): Promise<LearningUnit> => {
    const response = await apiService.get<LearningUnit>(`/learning-units/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateLearningUnitDto): Promise<LearningUnit> => {
    const response = await apiService.patch<LearningUnit>(`/learning-units/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: LearningUnitStatus): Promise<LearningUnit> => {
    const response = await apiService.patch<LearningUnit>(`/learning-units/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`/learning-units/${id}`);
  },

  getStats: async (): Promise<LearningUnitStats> => {
    const response = await apiService.get<LearningUnitStats>('/learning-units/stats');
    return response.data;
  },

  getAnalytics: async (): Promise<LearningUnitAnalytics> => {
    const response = await apiService.get<LearningUnitAnalytics>('/learning-units/analytics');
    return response.data;
  },

  generateAccessToken: async (learningUnitId: string, deviceType: string): Promise<{
    token: string;
    expiresAt: string;
    watermarkText?: string;
  }> => {
    const response = await apiService.post('/learning-units/access', { learningUnitId, deviceType });
    return response.data;
  },
};

export default learningUnitService;
