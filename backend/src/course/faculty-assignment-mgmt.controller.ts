import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { FacultyAssignmentMgmtService } from './faculty-assignment-mgmt.service';

@Controller('faculty/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACULTY)
export class FacultyAssignmentMgmtController {
  constructor(private readonly svc: FacultyAssignmentMgmtService) {}

  /** Create a new assignment (linked to a course, optionally with self-paced resource) */
  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.createAssignment(user.userId, user.collegeId, body);
  }

  /** List all assignments created by this teacher */
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.getMyAssignments(user.userId, { courseId, status });
  }

  /** Get single assignment with student submissions */
  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getAssignment(user.userId, id);
  }

  /** Update assignment (title, description, dueDate, marks) */
  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateAssignment(user.userId, id, body);
  }

  /** Delete an assignment */
  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.deleteAssignment(user.userId, id);
  }

  /** Assign to students (individual or batch) */
  @Post(':id/assign')
  async assignStudents(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.assignToStudents(user.userId, id, body);
  }

  /** Grade a student submission */
  @Post(':id/grade/:studentId')
  async gradeStudent(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() body: { score: number; feedback?: string },
  ) {
    return this.svc.gradeSubmission(user.userId, id, studentId, body);
  }

  /** Get self-paced resources owned by this teacher (for attaching to assignments) */
  @Get('resources/my-resources')
  async getMyResources(@CurrentUser() user: any) {
    return this.svc.getTeacherResources(user.userId);
  }
}
