import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/publisher-admin/mcqs`;

export interface Mcq {
  id: string;
  question: string;
  questionImage?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation?: string;
  explanationImage?: string;
  subject: string;
  topic?: string;
  topicId?: string;
  mcqType?: string;
  difficultyLevel: string;
  bloomsLevel: string;
  competencyIds: string[];
  tags: string[];
  year?: number;
  source?: string;
  status: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  usageCount: number;
  correctRate: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
  topicRef?: {
    id: string;
    name: string;
    code: string;
    subject: string;
  };
}

export interface CreateMcqDto {
  question: string;
  questionImage?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation?: string;
  explanationImage?: string;
  subject: string;
  topic?: string;
  topicId?: string;
  mcqType?: string;
  difficultyLevel: string;
  bloomsLevel: string;
  competencyIds?: string[];
  tags?: string[];
  year?: number;
  source?: string;
}

export interface McqStats {
  total: number;
  byStatus: Record<string, number>;
  bySubject: Record<string, number>;
  byDifficulty: Record<string, number>;
  verified: number;
  unverified: number;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const mcqService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    subject?: string;
    topic?: string;
    status?: string;
    difficultyLevel?: string;
    search?: string;
  }) => {
    const response = await axios.get(API_BASE_URL, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  },

  getStats: async (): Promise<McqStats> => {
    const response = await axios.get(`${API_BASE_URL}/stats`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getById: async (id: string): Promise<Mcq> => {
    const response = await axios.get(`${API_BASE_URL}/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  create: async (dto: CreateMcqDto): Promise<Mcq> => {
    const response = await axios.post(API_BASE_URL, dto, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  update: async (id: string, dto: Partial<CreateMcqDto>): Promise<Mcq> => {
    const response = await axios.put(`${API_BASE_URL}/${id}`, dto, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  verify: async (id: string, approve: boolean): Promise<Mcq> => {
    const response = await axios.post(`${API_BASE_URL}/${id}/verify`, 
      { approve },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  bulkUpload: async (file: File): Promise<{ success: number; failed: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/bulk-upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Upload image for MCQ (question or explanation image)
   */
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/upload-image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default mcqService;
