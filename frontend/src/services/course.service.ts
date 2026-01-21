import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface LearningFlowStep {
  learningUnitId: string;
  stepOrder: number;
  stepType: 'BOOK' | 'VIDEO' | 'MCQ' | 'NOTES';
  mandatory: boolean;
  completionCriteria?: {
    videoMinWatchPercent?: number;
    bookMinReadDuration?: number;
    requiredScrollPercent?: number;
  };
}

export interface CreateCourseData {
  title: string;
  description?: string;
  academicYear: string;
  competencyIds?: string[];
  learningFlowSteps: LearningFlowStep[];
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  academicYear?: string;
  status?: string;
  competencyIds?: string[];
  learningFlowSteps?: LearningFlowStep[];
}

export interface AssignCourseData {
  courseId: string;
  assignmentType: 'INDIVIDUAL' | 'BATCH';
  studentIds: string[];
  dueDate?: string;
}

export const courseService = {
  create: async (data: CreateCourseData) => {
    const response = await axios.post(`${API_BASE_URL}/courses`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    academicYear?: string;
    search?: string;
  }) => {
    const response = await axios.get(`${API_BASE_URL}/courses`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/courses/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  update: async (id: string, data: UpdateCourseData) => {
    const response = await axios.put(`${API_BASE_URL}/courses/${id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  publish: async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/courses/${id}/publish`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/courses/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  assign: async (data: AssignCourseData) => {
    const response = await axios.post(`${API_BASE_URL}/courses/assign`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getAnalytics: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/courses/${id}/analytics`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};
