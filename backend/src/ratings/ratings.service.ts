import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto, UpdateRatingDto, RatingType } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Submit or update a rating
   */
  async submitRating(userId: string, dto: CreateRatingDto) {
    // Get student record
    const student = await this.prisma.students.findFirst({
      where: { userId },
      include: { college: true },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    // Validate entity exists
    await this.validateEntity(dto.ratingType, dto.entityId);

    // Check if rating already exists (upsert)
    const existingRating = await this.prisma.ratings.findUnique({
      where: {
        studentId_ratingType_entityId: {
          studentId: student.id,
          ratingType: dto.ratingType,
          entityId: dto.entityId,
        },
      },
    });

    if (existingRating) {
      // Update existing rating
      return this.prisma.ratings.update({
        where: { id: existingRating.id },
        data: {
          rating: dto.rating,
          feedback: dto.feedback,
          isAnonymous: dto.isAnonymous ?? true,
        },
      });
    }

    // Create new rating
    return this.prisma.ratings.create({
      data: {
        studentId: student.id,
        collegeId: student.collegeId,
        ratingType: dto.ratingType,
        entityId: dto.entityId,
        rating: dto.rating,
        feedback: dto.feedback,
        isAnonymous: dto.isAnonymous ?? true,
      },
    });
  }

  /**
   * Get student's own ratings
   */
  async getMyRatings(userId: string) {
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    return this.prisma.ratings.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get aggregate ratings for an entity
   */
  async getEntityRatings(ratingType: RatingType, entityId: string) {
    const ratings = await this.prisma.ratings.findMany({
      where: { ratingType, entityId },
      select: {
        rating: true,
        feedback: true,
        isAnonymous: true,
        createdAt: true,
        student: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // Calculate aggregate stats
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Distribution
    const distribution = {
      1: ratings.filter(r => r.rating === 1).length,
      2: ratings.filter(r => r.rating === 2).length,
      3: ratings.filter(r => r.rating === 3).length,
      4: ratings.filter(r => r.rating === 4).length,
      5: ratings.filter(r => r.rating === 5).length,
    };

    // Anonymize feedback
    const feedbackList = ratings
      .filter(r => r.feedback)
      .map(r => ({
        rating: r.rating,
        feedback: r.feedback,
        studentName: r.isAnonymous ? 'Anonymous' : r.student.fullName,
        createdAt: r.createdAt,
      }));

    return {
      entityId,
      ratingType,
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
      feedbackList,
    };
  }

  /**
   * Get all course ratings for a college (College Admin view)
   */
  async getCollegeCourseRatings(collegeId: string) {
    const ratings = await this.prisma.ratings.groupBy({
      by: ['entityId'],
      where: {
        collegeId,
        ratingType: 'COURSE',
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Get course details
    const courseIds = ratings.map(r => r.entityId);
    const courses = await this.prisma.courses.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });

    return ratings.map(r => {
      const course = courses.find(c => c.id === r.entityId);
      return {
        courseId: r.entityId,
        courseTitle: course?.title || 'Unknown',
        averageRating: Math.round((r._avg.rating || 0) * 10) / 10,
        totalRatings: r._count.rating,
      };
    });
  }

  /**
   * Get all teacher ratings for a college (College Admin view)
   */
  async getCollegeTeacherRatings(collegeId: string) {
    const ratings = await this.prisma.ratings.groupBy({
      by: ['entityId'],
      where: {
        collegeId,
        ratingType: 'TEACHER',
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Get teacher details
    const teacherIds = ratings.map(r => r.entityId);
    const teachers = await this.prisma.users.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, fullName: true },
    });

    return ratings.map(r => {
      const teacher = teachers.find(t => t.id === r.entityId);
      return {
        teacherId: r.entityId,
        teacherName: teacher?.fullName || 'Unknown',
        averageRating: Math.round((r._avg.rating || 0) * 10) / 10,
        totalRatings: r._count.rating,
      };
    });
  }

  /**
   * Get content ratings for a publisher
   */
  async getPublisherContentRatings(publisherId: string) {
    // Get all content from publisher
    const learningUnits = await this.prisma.learning_units.findMany({
      where: { publisherId },
      select: { id: true, title: true },
    });

    const contentIds = learningUnits.map(lu => lu.id);

    const ratings = await this.prisma.ratings.groupBy({
      by: ['entityId'],
      where: {
        ratingType: 'CONTENT',
        entityId: { in: contentIds },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return ratings.map(r => {
      const content = learningUnits.find(lu => lu.id === r.entityId);
      return {
        contentId: r.entityId,
        contentTitle: content?.title || 'Unknown',
        averageRating: Math.round((r._avg.rating || 0) * 10) / 10,
        totalRatings: r._count.rating,
      };
    });
  }

  /**
   * Get global rating analytics (Bitflow Owner)
   */
  async getGlobalRatingAnalytics() {
    // Overall stats by type
    const courseStats = await this.prisma.ratings.aggregate({
      where: { ratingType: 'COURSE' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const teacherStats = await this.prisma.ratings.aggregate({
      where: { ratingType: 'TEACHER' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const contentStats = await this.prisma.ratings.aggregate({
      where: { ratingType: 'CONTENT' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Rating trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRatings = await this.prisma.ratings.groupBy({
      by: ['ratingType'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Top rated courses
    const topCourses = await this.prisma.ratings.groupBy({
      by: ['entityId'],
      where: { ratingType: 'COURSE' },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 5,
    });

    const courseIds = topCourses.map(r => r.entityId);
    const courses = await this.prisma.courses.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });

    return {
      overall: {
        courses: {
          averageRating: Math.round((courseStats._avg.rating || 0) * 10) / 10,
          totalRatings: courseStats._count.rating,
        },
        teachers: {
          averageRating: Math.round((teacherStats._avg.rating || 0) * 10) / 10,
          totalRatings: teacherStats._count.rating,
        },
        content: {
          averageRating: Math.round((contentStats._avg.rating || 0) * 10) / 10,
          totalRatings: contentStats._count.rating,
        },
      },
      recentTrends: recentRatings.map(r => ({
        type: r.ratingType,
        averageRating: Math.round((r._avg.rating || 0) * 10) / 10,
        count: r._count.rating,
      })),
      topCourses: topCourses.map(r => {
        const course = courses.find(c => c.id === r.entityId);
        return {
          courseId: r.entityId,
          courseTitle: course?.title || 'Unknown',
          averageRating: Math.round((r._avg.rating || 0) * 10) / 10,
          totalRatings: r._count.rating,
        };
      }),
    };
  }

  /**
   * Delete a rating
   */
  async deleteRating(userId: string, ratingId: string) {
    const student = await this.prisma.students.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    const rating = await this.prisma.ratings.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    if (rating.studentId !== student.id) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    return this.prisma.ratings.delete({
      where: { id: ratingId },
    });
  }

  /**
   * Validate that the entity being rated exists
   */
  private async validateEntity(ratingType: RatingType, entityId: string) {
    switch (ratingType) {
      case RatingType.COURSE:
        const course = await this.prisma.courses.findUnique({
          where: { id: entityId },
        });
        if (!course) throw new NotFoundException('Course not found');
        break;

      case RatingType.TEACHER:
        const teacher = await this.prisma.users.findFirst({
          where: { id: entityId, role: { in: ['FACULTY', 'COLLEGE_HOD'] } },
        });
        if (!teacher) throw new NotFoundException('Teacher not found');
        break;

      case RatingType.CONTENT:
        const content = await this.prisma.learning_units.findUnique({
          where: { id: entityId },
        });
        if (!content) throw new NotFoundException('Content not found');
        break;
    }
  }
}
