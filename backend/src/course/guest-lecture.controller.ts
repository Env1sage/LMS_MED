import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { GuestLectureService } from './guest-lecture.service';

@Controller('guest-lectures')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestLectureController {
  constructor(private readonly svc: GuestLectureService) {}

  /** Faculty/HOD creates a guest lecture */
  @Post()
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_HOD)
  async create(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.create(user.userId, user.collegeId, body);
  }

  /** List lectures for a college (all roles) */
  @Get()
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.STUDENT, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  async findAll(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.svc.findAll(user.collegeId, status);
  }

  /** Get my created lectures (faculty/HOD) */
  @Get('my-lectures')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD)
  async getMyLectures(@CurrentUser() user: any) {
    return this.svc.getMyLectures(user.userId);
  }

  /** Get my registrations (student) */
  @Get('my-registrations')
  @Roles(UserRole.STUDENT)
  async getMyRegistrations(@CurrentUser() user: any) {
    return this.svc.getMyRegistrations(user.userId);
  }

  /** Get single lecture */
  @Get(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.STUDENT, UserRole.COLLEGE_HOD, UserRole.COLLEGE_DEAN)
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  /** Update lecture */
  @Put(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_HOD)
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, user.userId, body);
  }

  /** Delete lecture */
  @Delete(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_HOD)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.remove(id, user.userId);
  }

  /** Student registers for lecture (FCFS) */
  @Post(':id/register')
  @Roles(UserRole.STUDENT)
  async register(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.register(id, user.userId);
  }

  /** Student cancels registration */
  @Delete(':id/register')
  @Roles(UserRole.STUDENT)
  async unregister(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.unregister(id, user.userId);
  }

  /** Faculty/HOD marks attendance */
  @Post(':id/attendance')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_HOD)
  async markAttendance(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { studentIds: string[] }) {
    return this.svc.markAttendance(id, user.userId, body.studentIds);
  }
}
