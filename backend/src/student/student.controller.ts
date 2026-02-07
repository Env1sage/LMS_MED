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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { BulkPromoteStudentsDto } from './dto/bulk-promote-students.dto';
import { ResetCredentialsDto } from './dto/reset-credentials.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * Create a new student (COLLEGE_ADMIN only)
   * POST /api/students
   */
  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  create(
    @Body() createDto: CreateStudentDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.create(createDto, userId, collegeId);
  }

  /**
   * Get all students for authenticated college admin
   * GET /api/students
   */
  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD, UserRole.FACULTY)
  findAll(
    @Query() query: QueryStudentDto,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.findAll(collegeId, query);
  }

  /**
   * Get student statistics
   * GET /api/students/stats
   */
  @Get('stats')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  getStats(@CurrentUser('collegeId') collegeId: string) {
    return this.studentService.getStats(collegeId);
  }

  /**
   * Get student performance analytics
   * GET /api/students/performance-analytics
   */
  @Get('performance-analytics')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  getPerformanceAnalytics(@CurrentUser('collegeId') collegeId: string) {
    return this.studentService.getPerformanceAnalytics(collegeId);
  }

  /**
   * Get student by ID
   * GET /api/students/:id
   */
  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  findOne(
    @Param('id') id: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.findOne(id, collegeId);
  }

  /**
   * Update student
   * PATCH /api/students/:id
   */
  @Patch(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStudentDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.update(id, updateDto, userId, collegeId);
  }

  /**
   * Activate student
   * PATCH /api/students/:id/activate
   */
  @Patch(':id/activate')
  @Roles(UserRole.COLLEGE_ADMIN)
  activate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.activate(id, userId, collegeId);
  }

  /**
   * Deactivate student
   * PATCH /api/students/:id/deactivate
   */
  @Patch(':id/deactivate')
  @Roles(UserRole.COLLEGE_ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.deactivate(id, userId, collegeId);
  }

  /**
   * Bulk promote students
   * POST /api/students/bulk-promote
   */
  @Post('bulk-promote')
  @Roles(UserRole.COLLEGE_ADMIN)
  bulkPromote(
    @Body() dto: BulkPromoteStudentsDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.bulkPromote(dto, userId, collegeId);
  }

  /**
   * Bulk upload students from CSV
   * POST /api/students/bulk-upload
   */
  @Post('bulk-upload')
  @Roles(UserRole.COLLEGE_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }
    return this.studentService.bulkUploadFromCSV(file.buffer, userId, collegeId);
  }

  /**
   * Reset student credentials
   * POST /api/students/:id/reset-credentials
   */
  @Post(':id/reset-credentials')
  @Roles(UserRole.COLLEGE_ADMIN)
  resetCredentials(
    @Param('id') id: string,
    @Body() dto: ResetCredentialsDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.resetCredentials(id, dto, userId, collegeId);
  }

  /**
   * Delete student permanently
   * DELETE /api/students/:id
   */
  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('collegeId') collegeId: string,
  ) {
    return this.studentService.delete(id, userId, collegeId);
  }
}
