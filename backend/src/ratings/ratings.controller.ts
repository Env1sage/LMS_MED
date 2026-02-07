import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, RatingType } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  /**
   * Submit or update a rating (Student only)
   */
  @Post()
  @Roles('STUDENT')
  async submitRating(@Request() req: any, @Body() dto: CreateRatingDto) {
    return this.ratingsService.submitRating(req.user.userId, dto);
  }

  /**
   * Get my ratings (Student only)
   */
  @Get('my')
  @Roles('STUDENT')
  async getMyRatings(@Request() req: any) {
    return this.ratingsService.getMyRatings(req.user.userId);
  }

  /**
   * Get aggregate ratings for an entity
   */
  @Get('entity/:type/:id')
  async getEntityRatings(
    @Param('type') type: RatingType,
    @Param('id') entityId: string,
  ) {
    return this.ratingsService.getEntityRatings(type, entityId);
  }

  /**
   * Get college course ratings (College Admin/Dean)
   */
  @Get('college/:collegeId/courses')
  @Roles('COLLEGE_ADMIN', 'COLLEGE_DEAN', 'BITFLOW_OWNER')
  async getCollegeCourseRatings(@Param('collegeId') collegeId: string) {
    return this.ratingsService.getCollegeCourseRatings(collegeId);
  }

  /**
   * Get college teacher ratings (College Admin/Dean)
   */
  @Get('college/:collegeId/teachers')
  @Roles('COLLEGE_ADMIN', 'COLLEGE_DEAN', 'BITFLOW_OWNER')
  async getCollegeTeacherRatings(@Param('collegeId') collegeId: string) {
    return this.ratingsService.getCollegeTeacherRatings(collegeId);
  }

  /**
   * Get publisher content ratings
   */
  @Get('publisher/:publisherId/content')
  @Roles('PUBLISHER_ADMIN', 'BITFLOW_OWNER')
  async getPublisherContentRatings(@Param('publisherId') publisherId: string) {
    return this.ratingsService.getPublisherContentRatings(publisherId);
  }

  /**
   * Get global rating analytics (Bitflow Owner)
   */
  @Get('analytics/global')
  @Roles('BITFLOW_OWNER')
  async getGlobalRatingAnalytics() {
    return this.ratingsService.getGlobalRatingAnalytics();
  }

  /**
   * Delete a rating (Student only - own ratings)
   */
  @Delete(':id')
  @Roles('STUDENT')
  async deleteRating(@Request() req: any, @Param('id') ratingId: string) {
    return this.ratingsService.deleteRating(req.user.userId, ratingId);
  }
}
