import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { FacultyTestService } from './faculty-test.service';

@Controller('faculty/tests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACULTY)
export class FacultyTestController {
  constructor(private readonly svc: FacultyTestService) {}

  /** Create a new test/quiz */
  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.createTest(user.userId, user.collegeId, body);
  }

  /** List faculty's tests */
  @Get()
  async findAll(@CurrentUser() user: any, @Query('courseId') courseId?: string) {
    return this.svc.getMyTests(user.userId, courseId);
  }

  /** Get single test with questions */
  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getTest(id, user.userId);
  }

  /** Update test */
  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateTest(id, user.userId, body);
  }

  /** Delete test */
  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.deleteTest(id, user.userId);
  }

  /** Add MCQ questions to test */
  @Post(':id/questions')
  async addQuestions(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { mcqIds: string[]; marks?: number }) {
    return this.svc.addQuestionsToTest(id, user.userId, body.mcqIds, body.marks || 1);
  }

  /** Remove question from test */
  @Delete(':id/questions/:questionId')
  async removeQuestion(@CurrentUser() user: any, @Param('id') id: string, @Param('questionId') questionId: string) {
    return this.svc.removeQuestionFromTest(id, user.userId, questionId);
  }

  /** Assign test to students */
  @Post(':id/assign')
  async assign(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { studentIds: string[]; dueDate?: string }) {
    return this.svc.assignTest(id, user.userId, body.studentIds, body.dueDate);
  }

  /** Publish test */
  @Post(':id/publish')
  async publish(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.publishTest(id, user.userId);
  }

  /** Create MCQ (faculty-owned) */
  @Post('mcqs')
  async createMcq(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.createMcq(user.userId, body);
  }

  /** List faculty's MCQs */
  @Get('mcqs/my')
  async getMyMcqs(@CurrentUser() user: any, @Query('subject') subject?: string) {
    return this.svc.getMyMcqs(user.userId, subject);
  }

  /** Get available MCQs from packages */
  @Get('mcqs/available')
  async getAvailableMcqs(@CurrentUser() user: any, @Query('subject') subject?: string) {
    return this.svc.getAvailableMcqs(user.collegeId, subject);
  }

  /** Bulk upload MCQs from CSV */
  @Post('mcqs/bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadMcqs(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.svc.bulkUploadMcqs(user.userId, file);
  }
}
