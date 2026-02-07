import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto, UpdateTopicDto, SearchTopicsDto } from './dto/topics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('topics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  /**
   * Search topics (for autocomplete dropdown)
   * Accessible by: Publisher Admin, Faculty, College Admin
   */
  @Get('search')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.FACULTY)
  async search(
    @Query('query') query: string,
    @Query('subject') subject?: string,
  ) {
    return this.topicsService.search(query || '', subject);
  }

  /**
   * Get all unique subjects
   */
  @Get('subjects')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.FACULTY)
  async getSubjects() {
    return this.topicsService.getSubjects();
  }

  /**
   * Get topics by subject
   */
  @Get('by-subject/:subject')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.FACULTY)
  async findBySubject(@Param('subject') subject: string) {
    return this.topicsService.findBySubject(subject);
  }

  /**
   * Get competencies linked to a specific topic
   * This is for auto-loading competencies when a topic is selected
   */
  @Get(':id/competencies')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.FACULTY)
  async getCompetenciesByTopic(@Param('id') id: string) {
    return this.topicsService.getCompetenciesByTopic(id);
  }

  /**
   * Get all topics with filters
   */
  @Get()
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.FACULTY)
  async findAll(@Query() filters: SearchTopicsDto) {
    return this.topicsService.findAll(filters);
  }

  /**
   * Get a single topic by ID
   */
  @Get(':id')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.FACULTY)
  async findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }

  /**
   * Create a new topic
   * Only Bitflow Owner can create topics (CBME repository is centrally managed)
   */
  @Post()
  @Roles(UserRole.BITFLOW_OWNER)
  async create(@Body() dto: CreateTopicDto, @Request() req: any) {
    return this.topicsService.create(dto, req.user.id);
  }

  /**
   * Bulk import topics
   * Only Bitflow Owner can bulk import
   */
  @Post('bulk-import')
  @Roles(UserRole.BITFLOW_OWNER)
  async bulkImport(@Body() topics: CreateTopicDto[], @Request() req: any) {
    return this.topicsService.bulkImport(topics, req.user.id);
  }

  /**
   * Update a topic
   * Only Bitflow Owner can update topics
   */
  @Put(':id')
  @Roles(UserRole.BITFLOW_OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTopicDto,
    @Request() req: any,
  ) {
    return this.topicsService.update(id, dto, req.user.id);
  }

  /**
   * Delete (deactivate) a topic
   * Only Bitflow Owner can delete topics
   */
  @Delete(':id')
  @Roles(UserRole.BITFLOW_OWNER)
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.topicsService.delete(id, req.user.id);
  }
}
