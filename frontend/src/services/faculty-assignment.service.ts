import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string | null;
  course: { id: string; title: string; academicYear: string };
  status: string;
  totalMarks: number;
  passingMarks: number;
  dueDate: string | null;
  startDate: string | null;
  createdAt: string;
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  students: StudentAssignment[];
}

export interface StudentAssignment {
  studentId: string;
  name: string;
  email?: string;
  academicYear: string;
  assignedAt: string;
  dueDate: string | null;
  status: string;
  score: number | null;
  percentageScore: number | null;
  isPassed: boolean | null;
  submittedAt: string | null;
  timeSpent?: number | null;
}

export interface SelfPacedResource {
  id: string;
  title: string;
  resourceType: string;
  subject: string | null;
  academicYear: string | null;
  viewCount: number;
  createdAt: string;
}

const facultyAssignmentService = {
  // Create assignment
  create: async (data: {
    courseId: string;
    title: string;
    description?: string;
    totalMarks?: number;
    passingMarks?: number;
    dueDate?: string;
    startDate?: string;
    studentIds?: string[];
    selfPacedResourceId?: string;
    subject?: string;
  }): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/faculty/assignments`, data, { headers: getAuthHeaders() });
    return res.data;
  },

  // Get all assignments
  getAll: async (filters?: { courseId?: string; status?: string }): Promise<TeacherAssignment[]> => {
    const params: any = {};
    if (filters?.courseId) params.courseId = filters.courseId;
    if (filters?.status) params.status = filters.status;
    const res = await axios.get(`${API_BASE_URL}/faculty/assignments`, { headers: getAuthHeaders(), params });
    return res.data;
  },

  // Get single assignment
  getOne: async (id: string): Promise<TeacherAssignment> => {
    const res = await axios.get(`${API_BASE_URL}/faculty/assignments/${id}`, { headers: getAuthHeaders() });
    return res.data;
  },

  // Update assignment
  update: async (id: string, data: any): Promise<any> => {
    const res = await axios.put(`${API_BASE_URL}/faculty/assignments/${id}`, data, { headers: getAuthHeaders() });
    return res.data;
  },

  // Delete assignment
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/faculty/assignments/${id}`, { headers: getAuthHeaders() });
  },

  // Assign to students
  assignStudents: async (id: string, data: { studentIds: string[]; dueDate?: string }): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/faculty/assignments/${id}/assign`, data, { headers: getAuthHeaders() });
    return res.data;
  },

  // Grade a student
  gradeStudent: async (assignmentId: string, studentId: string, data: { score: number; feedback?: string }): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/faculty/assignments/${assignmentId}/grade/${studentId}`, data, { headers: getAuthHeaders() });
    return res.data;
  },

  // Get teacher's self-paced resources
  getResources: async (): Promise<SelfPacedResource[]> => {
    const res = await axios.get(`${API_BASE_URL}/faculty/assignments/resources/my-resources`, { headers: getAuthHeaders() });
    return res.data;
  },

  // === Notification methods for faculty ===
  sendNotification: async (data: {
    title: string;
    message: string;
    type?: string;
    priority?: string;
    audience?: string;
    departmentId?: string;
    academicYear?: string;
  }): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/faculty/notifications/send`, data, { headers: getAuthHeaders() });
    return res.data;
  },

  getDailyLimit: async (): Promise<{ used: number; remaining: number; max: number }> => {
    const res = await axios.get(`${API_BASE_URL}/faculty/notifications/daily-limit`, { headers: getAuthHeaders() });
    return res.data;
  },

  getSentNotifications: async (): Promise<any[]> => {
    const res = await axios.get(`${API_BASE_URL}/faculty/notifications/sent`, { headers: getAuthHeaders() });
    return res.data;
  },
};

export default facultyAssignmentService;
