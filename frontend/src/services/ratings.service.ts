import apiService from './api.service';

export enum RatingType {
  COURSE = 'COURSE',
  TEACHER = 'TEACHER',
  CONTENT = 'CONTENT',
}

export interface Rating {
  id: string;
  studentId: string;
  collegeId: string;
  ratingType: RatingType;
  entityId: string;
  rating: number;
  feedback?: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRatingDto {
  ratingType: RatingType;
  entityId: string;
  rating: number;
  feedback?: string;
  isAnonymous?: boolean;
}

export interface RatingStats {
  entityId: string;
  ratingType: RatingType;
  totalRatings: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  feedbackList: Array<{
    rating: number;
    feedback: string;
    studentName: string;
    createdAt: string;
  }>;
}

export interface CollegeRatingItem {
  courseId?: string;
  courseTitle?: string;
  teacherId?: string;
  teacherName?: string;
  averageRating: number;
  totalRatings: number;
}

export interface GlobalRatingAnalytics {
  overall: {
    courses: { averageRating: number; totalRatings: number };
    teachers: { averageRating: number; totalRatings: number };
    content: { averageRating: number; totalRatings: number };
  };
  recentTrends: Array<{
    type: string;
    averageRating: number;
    count: number;
  }>;
  topCourses: Array<{
    courseId: string;
    courseTitle: string;
    averageRating: number;
    totalRatings: number;
  }>;
}

class RatingsService {
  /**
   * Submit or update a rating
   */
  async submitRating(dto: CreateRatingDto): Promise<Rating> {
    const response = await apiService.post('/ratings', dto);
    return response.data;
  }

  /**
   * Get my ratings
   */
  async getMyRatings(): Promise<Rating[]> {
    const response = await apiService.get('/ratings/my');
    return response.data;
  }

  /**
   * Get ratings for a specific entity
   */
  async getEntityRatings(type: RatingType, entityId: string): Promise<RatingStats> {
    const response = await apiService.get(`/ratings/entity/${type}/${entityId}`);
    return response.data;
  }

  /**
   * Get college course ratings
   */
  async getCollegeCourseRatings(collegeId: string): Promise<CollegeRatingItem[]> {
    const response = await apiService.get(`/ratings/college/${collegeId}/courses`);
    return response.data;
  }

  /**
   * Get college teacher ratings
   */
  async getCollegeTeacherRatings(collegeId: string): Promise<CollegeRatingItem[]> {
    const response = await apiService.get(`/ratings/college/${collegeId}/teachers`);
    return response.data;
  }

  /**
   * Get publisher content ratings
   */
  async getPublisherContentRatings(publisherId: string): Promise<CollegeRatingItem[]> {
    const response = await apiService.get(`/ratings/publisher/${publisherId}/content`);
    return response.data;
  }

  /**
   * Get global rating analytics
   */
  async getGlobalRatingAnalytics(): Promise<GlobalRatingAnalytics> {
    const response = await apiService.get('/ratings/analytics/global');
    return response.data;
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string): Promise<void> {
    await apiService.delete(`/ratings/${ratingId}`);
  }
}

export const ratingsService = new RatingsService();
export default ratingsService;
