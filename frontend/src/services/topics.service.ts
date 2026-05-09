import apiService from './api.service';

export interface Topic {
  id: string;
  subject: string;
  name: string;
  code: string;
  description?: string;
  academicYear?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    competencies: number;
    learning_units: number;
    mcqs: number;
  };
}

export interface CreateTopicDto {
  subject: string;
  name: string;
  code: string;
  description?: string;
  academicYear?: string;
  status?: string;
}

export interface UpdateTopicDto {
  subject?: string;
  name?: string;
  description?: string;
  academicYear?: string;
  status?: string;
}

export interface SearchTopicsParams {
  query?: string;
  subject?: string;
  academicYear?: string;
}

export const topicsService = {
  /**
   * Search topics for autocomplete/dropdown
   */
  search: async (query: string, subject?: string): Promise<Topic[]> => {
    const params: any = { query };
    if (subject) params.subject = subject;
    const response = await apiService.get<Topic[]>('/topics/search', { params });
    return response.data;
  },

  /**
   * Get all unique subjects
   */
  getSubjects: async (): Promise<string[]> => {
    const response = await apiService.get<string[]>('/topics/subjects');
    return response.data;
  },

  /**
   * Get topics by subject
   */
  getBySubject: async (subject: string): Promise<Topic[]> => {
    const response = await apiService.get<Topic[]>(`/topics/by-subject/${encodeURIComponent(subject)}`);
    return response.data;
  },

  /**
   * Get all topics with optional filters
   */
  getAll: async (params?: SearchTopicsParams): Promise<Topic[]> => {
    const response = await apiService.get<Topic[]>('/topics', { params });
    return response.data;
  },

  /**
   * Get a single topic by ID
   */
  getById: async (id: string): Promise<Topic> => {
    const response = await apiService.get<Topic>(`/topics/${id}`);
    return response.data;
  },

  /**
   * Get competencies linked to a specific topic
   * Used for auto-loading competencies when topic is selected
   */
  getCompetenciesByTopic: async (topicId: string): Promise<{
    topic: { id: string; name: string; code: string; subject: string };
    competencies: Array<{
      id: string;
      code: string;
      title: string;
      description: string;
      domain: string;
      academicLevel: string;
      subject: string;
    }>;
    count: number;
  }> => {
    const response = await apiService.get(`/topics/${topicId}/competencies`);
    return response.data;
  },

  /**
   * Create a new topic (Bitflow Owner only)
   */
  create: async (data: CreateTopicDto): Promise<Topic> => {
    const response = await apiService.post<Topic>('/topics', data);
    return response.data;
  },

  /**
   * Bulk import topics (Bitflow Owner only)
   */
  bulkImport: async (topics: CreateTopicDto[]): Promise<{ created: number; skipped: number; errors: string[] }> => {
    const response = await apiService.post<{ created: number; skipped: number; errors: string[] }>('/topics/bulk-import', topics);
    return response.data;
  },

  /**
   * Update a topic (Bitflow Owner only)
   */
  update: async (id: string, data: UpdateTopicDto): Promise<Topic> => {
    const response = await apiService.put<Topic>(`/topics/${id}`, data);
    return response.data;
  },

  /**
   * Delete (deactivate) a topic (Bitflow Owner only)
   */
  delete: async (id: string): Promise<Topic> => {
    const response = await apiService.delete<Topic>(`/topics/${id}`);
    return response.data;
  },
};

export default topicsService;
