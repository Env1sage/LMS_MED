import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { LearningUnitService } from './learning-unit.service';
import { CreateLearningUnitDto } from './dto/create-learning-unit.dto';
import { UpdateLearningUnitDto } from './dto/update-learning-unit.dto';
import { QueryLearningUnitDto } from './dto/query-learning-unit.dto';
import { GenerateAccessTokenDto } from './dto/generate-access-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PublisherContractGuard } from '../auth/guards/publisher-contract.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ContentStatus } from '@prisma/client';
import type { Request } from 'express';
import { FileUploadService } from '../publisher-admin/file-upload.service';

@Controller('learning-units')
@UseGuards(JwtAuthGuard, RolesGuard, PublisherContractGuard)
export class LearningUnitController {
  constructor(
    private readonly learningUnitService: LearningUnitService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  /**
   * Upload file for learning unit
   * POST /api/learning-units/upload
   */
  @Post('upload')
  @Roles(UserRole.PUBLISHER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: 'book' | 'video' | 'note' | 'image',
  ) {
    const url = await this.fileUploadService.uploadFile(file, type);
    return { url };
  }

  /**
   * Bulk upload learning units from CSV
   * POST /api/learning-units/bulk-upload
   */
  @Post('bulk-upload')
  @Roles(UserRole.PUBLISHER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.bulkUploadFromCsv(file, userId, publisherId);
  }

  /**
   * Bulk upload files with metadata
   * POST /api/learning-units/bulk-upload-files
   */
  @Post('bulk-upload-files')
  @Roles(UserRole.PUBLISHER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 20))
  async bulkUploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('metadata') metadataJson: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.bulkUploadWithFiles(files, metadataJson, userId, publisherId);
  }

  /**
   * Download CSV template for bulk upload
   * GET /api/learning-units/bulk-template
   */
  @Get('bulk-template')
  @Roles(UserRole.PUBLISHER_ADMIN)
  getBulkTemplate() {
    return {
      templateUrl: '/templates/learning-units-template.csv',
      columns: [
        'type (BOOK|VIDEO|MCQ)',
        'title',
        'description (min 20 chars)',
        'subject',
        'topic',
        'subTopic (optional)',
        'difficultyLevel (BEGINNER|INTERMEDIATE|ADVANCED)',
        'estimatedDuration (minutes)',
        'secureAccessUrl',
        'deliveryType (REDIRECT|EMBED|STREAM)',
        'watermarkEnabled (true|false)',
        'sessionExpiryMinutes',
        'competencyIds (comma-separated, optional)',
      ],
      example: 'BOOK,Cardiovascular Anatomy,Comprehensive guide to heart structure and function covering all major components,Anatomy,Cardiovascular System,,INTERMEDIATE,45,https://cdn.example.com/book1.pdf,REDIRECT,true,30,comp-1,comp-2',
    };
  }

  /**
   * Create a new learning unit (PUBLISHER_ADMIN only)
   * POST /api/learning-units
   */
  @Post()
  @Roles(UserRole.PUBLISHER_ADMIN)
  create(
    @Body() createDto: CreateLearningUnitDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.create(createDto, userId, publisherId);
  }

  /**
   * Get all learning units for authenticated publisher or faculty
   * GET /api/learning-units
   */
  @Get()
  @Roles(UserRole.PUBLISHER_ADMIN, UserRole.FACULTY)
  findAll(
    @Query() query: QueryLearningUnitDto,
    @CurrentUser('publisherId') publisherId: string | undefined,
  ) {
    return this.learningUnitService.findAll(publisherId, query);
  }

  /**
   * Get publisher analytics
   * GET /api/learning-units/analytics
   */
  @Get('analytics')
  @Roles(UserRole.PUBLISHER_ADMIN)
  getAnalytics(@CurrentUser('publisherId') publisherId: string) {
    return this.learningUnitService.getAnalytics(publisherId);
  }

  /**
   * Get learning unit statistics
   * GET /api/learning-units/stats
   */
  @Get('stats')
  @Roles(UserRole.PUBLISHER_ADMIN)
  getStats(@CurrentUser('publisherId') publisherId: string) {
    return this.learningUnitService.getStats(publisherId);
  }

  /**
   * Generate access token for content (Faculty/Student can access)
   * POST /api/learning-units/access
   */
  @Post('access')
  @Roles(UserRole.FACULTY, UserRole.STUDENT, UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async generateAccessToken(
    @Body() dto: GenerateAccessTokenDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('fullName') fullName: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Get college name if collegeId exists
    let collegeName: string | undefined;
    if (collegeId) {
      const college = await this.learningUnitService['prisma'].colleges.findUnique({
        where: { id: collegeId },
      });
      collegeName = college?.name;
    }

    return this.learningUnitService.generateAccessToken(
      dto.learningUnitId,
      userId,
      collegeId,
      role,
      dto.deviceType || 'web',
      ipAddress,
      userAgent,
      fullName,
      collegeName,
    );
  }

  /**
   * Get learning unit by ID
   * GET /api/learning-units/:id
   */
  @Get(':id')
  @Roles(UserRole.PUBLISHER_ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.findOne(id, publisherId);
  }

  /**
   * Update learning unit
   * PATCH /api/learning-units/:id
   */
  @Patch(':id')
  @Roles(UserRole.PUBLISHER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLearningUnitDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.update(id, updateDto, userId, publisherId);
  }

  /**
   * Update learning unit status
   * PATCH /api/learning-units/:id/status
   */
  @Patch(':id/status')
  @Roles(UserRole.PUBLISHER_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ContentStatus,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.updateStatus(id, status, userId, publisherId);
  }

  /**
   * Activate content (requires competency mapping)
   * POST /api/learning-units/:id/activate
   */
  @Post(':id/activate')
  @Roles(UserRole.PUBLISHER_ADMIN)
  activateContent(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.activateContent(id, userId, publisherId);
  }

  /**
   * Deactivate content
   * POST /api/learning-units/:id/deactivate
   */
  @Post(':id/deactivate')
  @Roles(UserRole.PUBLISHER_ADMIN)
  deactivateContent(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.deactivateContent(id, reason || 'Deactivated by publisher', userId, publisherId);
  }

  /**
   * Delete learning unit (soft delete)
   * DELETE /api/learning-units/:id
   */
  @Delete(':id')
  @Roles(UserRole.PUBLISHER_ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('publisherId') publisherId: string,
  ) {
    return this.learningUnitService.remove(id, userId, publisherId);
  }
}
