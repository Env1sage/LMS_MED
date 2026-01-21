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
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles(UserRole.FACULTY)
  async create(@Request() req: any, @Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(req.user.userId, createCourseDto);
  }

  @Get()
  @Roles(UserRole.FACULTY)
  async findAll(@Request() req: any, @Query() query: QueryCourseDto) {
    return this.courseService.findAll(req.user.userId, query);
  }

  @Get(':id')
  @Roles(UserRole.FACULTY)
  async findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.FACULTY)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.courseService.update(req.user.userId, id, updateCourseDto);
  }

  @Post(':id/publish')
  @Roles(UserRole.FACULTY)
  async publish(@Request() req: any, @Param('id') id: string) {
    return this.courseService.publish(req.user.userId, id);
  }

  @Delete(':id')
  @Roles(UserRole.FACULTY)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.courseService.delete(req.user.userId, id);
  }

  @Post('assign')
  @Roles(UserRole.FACULTY)
  async assignCourse(@Request() req: any, @Body() assignCourseDto: AssignCourseDto) {
    return this.courseService.assignCourse(req.user.userId, assignCourseDto);
  }

  @Get(':id/analytics')
  @Roles(UserRole.FACULTY)
  async getAnalytics(@Request() req: any, @Param('id') id: string) {
    return this.courseService.getCourseAnalytics(req.user.userId, id);
  }
}
