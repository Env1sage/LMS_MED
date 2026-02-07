import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  academicYear: string;
  status: string;
  faculty: string;
  facultyEmail: string;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  notStartedStudents: number;
  completionRate: number;
  avgTestScore: number;
  passRate: number;
  avgProgressPercentage: number;
  totalLearningUnits: number;
  totalTests: number;
  totalAssignments: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAnalyticsOverview {
  totalCourses: number;
  analytics: CourseAnalytics[];
  summary: {
    avgCompletionRate: number;
    avgTestScore: number;
    avgPassRate: number;
    totalStudentsEnrolled: number;
  };
}

export interface CourseComparison {
  courseId: string;
  title: string;
  code: string;
  year: string;
  enrolledStudents: number;
  avgCompletion: number;
  avgScore: number;
  passRate: number;
  avgTimeSpentMinutes: number;
  totalTests: number;
  totalLearningUnits: number;
}

export interface CourseDetails {
  course: {
    id: string;
    title: string;
    code: string;
    description: string;
    academicYear: string;
    status: string;
    faculty: string;
    college: string;
    createdAt: string;
    updatedAt: string;
  };
  statistics: {
    totalStudents: number;
    totalLearningUnits: number;
    totalTests: number;
    totalCompetencies: number;
    completionRate: number;
  };
  studentPerformance: Array<{
    studentName: string;
    year: string;
    status: string;
    completionPercentage: number;
    completedSteps: number;
    totalSteps: number;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  testPerformance: Array<{
    testId: string;
    testTitle: string;
    totalQuestions: number;
    totalAttempts: number;
    avgScore: number;
    passRate: number;
    attempts: Array<{
      studentName: string;
      score: number;
      passed: boolean;
      submittedAt: string;
    }>;
  }>;
  learningUnits: Array<{
    stepNumber: number;
    title: string;
    type: string;
    mandatory: boolean;
  }>;
  competencies: Array<{
    code: string;
    description: string;
  }>;
}

class CourseAnalyticsService {
  async getCourseAnalyticsOverview(collegeId?: string): Promise<CourseAnalyticsOverview> {
    const params = collegeId ? { collegeId } : {};
    const response = await axios.get(`${API_URL}/governance/course-analytics/overview`, { 
      headers: getAuthHeaders(),
      params 
    });
    return response.data;
  }

  async getCourseComparison(collegeId?: string): Promise<CourseComparison[]> {
    const params = collegeId ? { collegeId } : {};
    const response = await axios.get(`${API_URL}/governance/course-analytics/course-comparison`, { 
      headers: getAuthHeaders(),
      params 
    });
    return response.data;
  }

  async getCourseDetails(courseId: string): Promise<CourseDetails> {
    const response = await axios.get(`${API_URL}/governance/course-analytics/course-details`, {
      headers: getAuthHeaders(),
      params: { courseId },
    });
    return response.data;
  }
}

export const courseAnalyticsService = new CourseAnalyticsService();
export default courseAnalyticsService;
