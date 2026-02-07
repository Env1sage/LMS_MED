import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface DashboardOverview {
  overview: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalAssignments: number;
    uniqueStudents: number;
    completedAssignments: number;
    inProgressAssignments: number;
    notStartedAssignments: number;
    overallCompletionRate: number;
    averageProgress: number;
    activeStudentsLast7Days: number;
  };
  courses: Array<{
    id: string;
    title: string;
    academicYear: string;
    status: string;
    assignmentCount: number;
    stepCount: number;
  }>;
}

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  academicYear: string;
  status: string;
  summary: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    completionRate: number;
    totalSteps: number;
  };
  studentDetails: StudentDetail[];
  stepAnalytics: StepAnalytic[];
}

export interface StudentDetail {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  email: string;
  academicYear: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  status: string;
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
  totalTimeSpent: number;
  lastActivity: string | null;
}

export interface StepAnalytic {
  stepId: string;
  stepNumber: number;
  stepOrder: number;
  stepType: string;
  mandatory: boolean;
  learningUnit: {
    id: string;
    title: string;
    type: string;
  };
  totalAttempted: number;
  completedCount: number;
  avgCompletionPercent: number;
  avgTimeSpent: number;
  completionRate: number;
}

export interface BatchSummary {
  departmentId: string;
  departmentName: string;
  academicYear: string;
  totalStudents: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface McqAnalytics {
  mcqSteps: Array<{
    stepId: string;
    learningUnitId: string;
    title: string;
  }>;
  summary: {
    totalAttempts: number;
    correctAttempts: number;
    avgScore: number;
  };
  byDifficulty: Array<{
    level: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }>;
}

export interface StudentProgressDetail {
  student: {
    id: string;
    fullName: string;
    enrollmentNumber: string;
    email: string;
  };
  assignment: {
    assignedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    dueDate: string | null;
    status: string;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    progressPercent: number;
    totalTimeSpent: number;
  };
  steps: Array<{
    stepId: string;
    stepNumber: number;
    stepOrder: number;
    stepType: string;
    mandatory: boolean;
    learningUnit: {
      id: string;
      title: string;
      type: string;
      estimatedDuration: number;
    };
    completionPercent: number;
    timeSpent: number;
    lastAccessed: string | null;
    isCompleted: boolean;
    isLocked: boolean;
  }>;
}

export const facultyAnalyticsService = {
  /**
   * Get faculty dashboard overview
   */
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const response = await axios.get(`${API_BASE_URL}/faculty/dashboard`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get detailed analytics for a course
   */
  getCourseAnalytics: async (courseId: string): Promise<CourseAnalytics> => {
    const response = await axios.get(
      `${API_BASE_URL}/faculty/courses/${courseId}/analytics`,
      { headers: getAuthHeaders() },
    );
    return response.data;
  },

  /**
   * Get batch-wise summary for a course
   */
  getBatchSummary: async (courseId: string): Promise<BatchSummary[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/faculty/courses/${courseId}/batch-summary`,
      { headers: getAuthHeaders() },
    );
    return response.data;
  },

  /**
   * Get MCQ analytics for a course
   */
  getMcqAnalytics: async (courseId: string): Promise<McqAnalytics> => {
    const response = await axios.get(
      `${API_BASE_URL}/faculty/courses/${courseId}/mcq-analytics`,
      { headers: getAuthHeaders() },
    );
    return response.data;
  },

  /**
   * Get individual student progress in a course
   */
  getStudentProgress: async (
    courseId: string,
    studentId: string,
  ): Promise<StudentProgressDetail> => {
    const response = await axios.get(
      `${API_BASE_URL}/faculty/courses/${courseId}/students/${studentId}`,
      { headers: getAuthHeaders() },
    );
    return response.data;
  },

  /**
   * Generate and get report (JSON format)
   */
  generateReport: async (
    courseId: string,
    format: 'summary' | 'detailed' = 'summary',
  ) => {
    const response = await axios.get(
      `${API_BASE_URL}/faculty/courses/${courseId}/report`,
      {
        params: { format },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  },

  /**
   * Download CSV report
   */
  downloadCsvReport: async (courseId: string) => {
    const response = await axios.get(
      `${API_BASE_URL}/faculty/courses/${courseId}/report/csv`,
      {
        headers: getAuthHeaders(),
        responseType: 'blob',
      },
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `course-report-${courseId}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get all students enrolled in faculty's courses
   */
  getAllStudents: async (filter?: 'all' | 'active' | 'assigned'): Promise<StudentListResponse> => {
    const params = filter ? `?filter=${filter}` : '';
    const response = await axios.get(`${API_BASE_URL}/faculty/students${params}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};

export interface StudentListResponse {
  total: number;
  students: StudentInfo[];
}

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  academicYear: string;
  coursesEnrolled: number;
  courseNames: string[];
  progress: number;
  status: string;
  isActive: boolean;
}

export default facultyAnalyticsService;
