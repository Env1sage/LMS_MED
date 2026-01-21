import apiService from './api.service';

interface SubmitProgressDto {
  stepId: number;
  completionPercent: number;
  timeSpentSeconds: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface CourseProgress {
  courseId: number;
  title: string;
  description: string;
  code: string;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  lastAccessedAt: string | null;
  nextStepId: number | null;
  nextStepTitle: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

class ProgressService {
  /**
   * Check if student has access to a specific step
   */
  async checkAccess(stepId: number): Promise<{ hasAccess: boolean; message?: string }> {
    const response = await apiService.post(`/progress/check-access/${stepId}`);
    return response.data;
  }

  /**
   * Submit progress for a learning step
   */
  async submitProgress(data: SubmitProgressDto): Promise<any> {
    const response = await apiService.post('/progress/submit', data);
    return response.data;
  }

  /**
   * Get progress for a specific course
   */
  async getCourseProgress(courseId: number): Promise<any> {
    const response = await apiService.get(`/progress/course/${courseId}`);
    return response.data;
  }

  /**
   * Get all courses assigned to the student with progress
   */
  async getMyCourses(): Promise<CourseProgress[]> {
    const response = await apiService.get('/progress/my-courses');
    return response.data;
  }

  /**
   * Mark a step as started
   */
  async startStep(stepId: number): Promise<any> {
    return this.submitProgress({
      stepId,
      completionPercent: 0,
      timeSpentSeconds: 0,
      status: 'IN_PROGRESS',
    });
  }

  /**
   * Mark a step as completed
   */
  async completeStep(stepId: number, timeSpentSeconds: number): Promise<any> {
    return this.submitProgress({
      stepId,
      completionPercent: 100,
      timeSpentSeconds,
      status: 'COMPLETED',
    });
  }

  /**
   * Update progress for a step (for partial completion)
   */
  async updateProgress(
    stepId: number,
    completionPercent: number,
    timeSpentSeconds: number
  ): Promise<any> {
    const status = completionPercent === 100 ? 'COMPLETED' : 'IN_PROGRESS';
    return this.submitProgress({
      stepId,
      completionPercent,
      timeSpentSeconds,
      status,
    });
  }
}

export default new ProgressService();
