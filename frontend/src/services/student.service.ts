import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const studentService = {
  // Create student
  create: async (data: any) => {
    const response = await axios.post(`${API_URL}/students`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Get all students
  getAll: async (params?: any) => {
    const response = await axios.get(`${API_URL}/students`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  },

  // Get student by ID
  getById: async (id: string) => {
    const response = await axios.get(`${API_URL}/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Update student
  update: async (id: string, data: any) => {
    const response = await axios.patch(`${API_URL}/students/${id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Activate student
  activate: async (id: string) => {
    const response = await axios.patch(`${API_URL}/students/${id}/activate`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Deactivate student
  deactivate: async (id: string) => {
    const response = await axios.patch(`${API_URL}/students/${id}/deactivate`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Bulk promote students
  bulkPromote: async (data: any) => {
    const response = await axios.post(`${API_URL}/students/bulk-promote`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Reset credentials
  resetCredentials: async (id: string, newPassword: string) => {
    const response = await axios.post(`${API_URL}/students/${id}/reset-credentials`, 
      { newPassword },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await axios.get(`${API_URL}/students/stats`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Get performance analytics for college dashboard
  getPerformanceAnalytics: async () => {
    const response = await axios.get(`${API_URL}/students/performance-analytics`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Bulk upload from CSV file
  bulkUpload: async (file: File) => {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_URL}/students/bulk-upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete student permanently
  delete: async (id: string) => {
    const response = await axios.delete(`${API_URL}/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};
