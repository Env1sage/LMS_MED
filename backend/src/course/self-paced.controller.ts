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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SelfPacedService } from './self-paced.service';
import {
  CreateSelfPacedResourceDto,
  UpdateSelfPacedResourceDto,
  SelfPacedResourceResponseDto,
  SelfPacedAccessLogDto,
} from './dto/self-paced.dto';

@Controller('self-paced')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SelfPacedController {
  constructor(private readonly selfPacedService: SelfPacedService) {}

  // ========================================================================
  // FACULTY ENDPOINTS - Create and manage self-paced resources
  // ========================================================================

  /**
   * Create a new self-paced resource
   * Faculty can upload supplementary learning materials
   */
  @Post()
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  @HttpCode(HttpStatus.CREATED)
  async createResource(
    @Body() dto: CreateSelfPacedResourceDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ): Promise<SelfPacedResourceResponseDto> {
    return this.selfPacedService.createResource(userId, collegeId, dto);
  }

  /**
   * Upload file for self-paced resource
   * Supports PDF, MP4, and other document types
   */
  @Post('upload')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/self-paced',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ): Promise<{ fileUrl: string }> {
    return this.selfPacedService.handleFileUpload(file);
  }

  /**
   * Get all resources created by faculty
   * Faculty can view and manage their own resources
   */
  @Get('my-resources')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  async getMyResources(
    @CurrentUser('userId') userId: string,
    @Query('subject') subject?: string,
    @Query('resourceType') resourceType?: string,
  ): Promise<SelfPacedResourceResponseDto[]> {
    return this.selfPacedService.getFacultyResources(userId, { subject, resourceType });
  }

  /**
   * Get analytics for a specific resource
   * View counts and access statistics
   */
  @Get('my-resources/:id/analytics')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  async getResourceAnalytics(
    @Param('id') resourceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.selfPacedService.getResourceAnalytics(resourceId, userId);
  }

  /**
   * Update a self-paced resource
   */
  @Put(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  async updateResource(
    @Param('id') resourceId: string,
    @Body() dto: UpdateSelfPacedResourceDto,
    @CurrentUser('userId') userId: string,
  ): Promise<SelfPacedResourceResponseDto> {
    return this.selfPacedService.updateResource(resourceId, userId, dto);
  }

  /**
   * Archive a self-paced resource
   * Makes it invisible to students
   */
  @Delete(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveResource(
    @Param('id') resourceId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.selfPacedService.archiveResource(resourceId, userId);
  }

  // ========================================================================
  // STUDENT ENDPOINTS - Access self-paced learning materials
  // ========================================================================

  /**
   * Get all available self-paced resources for students
   * Students see resources from their college
   */
  @Get('available')
  @Roles(UserRole.STUDENT)
  async getAvailableResources(
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
    @Query('subject') subject?: string,
    @Query('resourceType') resourceType?: string,
    @Query('academicYear') academicYear?: string,
  ): Promise<SelfPacedResourceResponseDto[]> {
    return this.selfPacedService.getAvailableResources(collegeId, {
      subject,
      resourceType,
      academicYear,
    });
  }

  /**
   * Get a specific self-paced resource
   * Increments view count
   */
  @Get(':id')
  @Roles(UserRole.STUDENT)
  async getResource(
    @Param('id') resourceId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<SelfPacedResourceResponseDto> {
    return this.selfPacedService.getResourceForStudent(resourceId, userId);
  }

  /**
   * Log access to a resource
   * Track viewing time and engagement
   */
  @Post(':id/access')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  async logAccess(
    @Param('id') resourceId: string,
    @Body() dto: SelfPacedAccessLogDto,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean }> {
    await this.selfPacedService.logAccess(resourceId, userId, dto.timeSpent);
    return { success: true };
  }

  /**
   * Get subjects with available resources
   */
  @Get('subjects/list')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  async getSubjects(
    @CurrentUser('collegeId') collegeId: string,
  ): Promise<string[]> {
    return this.selfPacedService.getAvailableSubjects(collegeId);
  }
}
