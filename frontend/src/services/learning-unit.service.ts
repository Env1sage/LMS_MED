import apiService from './api.service';
import { API_BASE_URL } from '../config/api';
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
    const response = await apiService.get<any>('/learning-units/stats');
    const data = response.data;
    
    // Transform array responses to Record format
    const byType: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    
    if (Array.isArray(data.byType)) {
      data.byType.forEach((item: { type: string; count: number }) => {
        byType[item.type] = item.count;
      });
    } else {
      Object.assign(byType, data.byType || {});
    }
    
    if (Array.isArray(data.byDifficulty)) {
      data.byDifficulty.forEach((item: { level: string; count: number }) => {
        byDifficulty[item.level] = item.count;
      });
    } else {
      Object.assign(byDifficulty, data.byDifficulty || {});
    }
    
    if (Array.isArray(data.byStatus)) {
      data.byStatus.forEach((item: { status: string; count: number }) => {
        byStatus[item.status] = item.count;
      });
    } else {
      Object.assign(byStatus, data.byStatus || {});
    }
    
    return {
      total: data.total,
      byType: byType as any,
      byDifficulty: byDifficulty as any,
      byStatus: byStatus as any,
    };
  },

  getAnalytics: async (): Promise<LearningUnitAnalytics> => {
    const response = await apiService.get<any>('/learning-units/analytics');
    const data = response.data;
    
    // Transform backend response to match frontend interface
    return {
      totalAccesses: data.totalViews || 0,
      uniqueUsers: data.uniqueViewers || 0,
      averageDuration: 0, // Not provided by backend
      popularUnits: [], // Not provided by backend in current implementation
    };
  },

  generateAccessToken: async (learningUnitId: string, deviceType: string): Promise<{
    token: string;
    expiresAt: string;
    watermarkText?: string;
  }> => {
    const response = await apiService.post('/learning-units/access', { learningUnitId, deviceType });
    return response.data;
  },

  // Bulk upload from CSV
  bulkUploadCsv: async (file: File): Promise<{
    success: number;
    failed: number;
    errors: string[];
    created: { id: string; title: string; type: string }[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/learning-units/bulk-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Bulk upload failed');
    }
    
    return response.json();
  },

  // Bulk upload files with metadata
  bulkUploadFiles: async (files: File[], metadata: any[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
    created: { id: string; title: string; type: string; fileUrl: string }[];
  }> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('metadata', JSON.stringify(metadata));
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/learning-units/bulk-upload-files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Bulk upload failed');
    }
    
    return response.json();
  },

  // Get bulk upload template info
  getBulkTemplate: async (): Promise<{
    templateUrl: string;
    columns: string[];
    example: string;
  }> => {
    const response = await apiService.get('/learning-units/bulk-template');
    return response.data;
  },

  // Activate content (requires competency mapping)
  activateContent: async (id: string): Promise<LearningUnit> => {
    const response = await apiService.post<LearningUnit>(`/learning-units/${id}/activate`);
    return response.data;
  },

  // Deactivate content
  deactivateContent: async (id: string, reason?: string): Promise<LearningUnit> => {
    const response = await apiService.post<LearningUnit>(`/learning-units/${id}/deactivate`, { reason });
    return response.data;
  },
};

export default learningUnitService;
