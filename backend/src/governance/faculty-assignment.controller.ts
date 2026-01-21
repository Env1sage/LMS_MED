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
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { FacultyAssignmentService } from './faculty-assignment.service';
import { AssignFacultyDto, UpdateFacultyAssignmentDto, RemoveFacultyDto } from './dto/faculty-assignment.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    collegeId?: string;
    publisherId?: string;
  };
}

@Controller('governance/faculty-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacultyAssignmentController {
  constructor(private readonly facultyAssignmentService: FacultyAssignmentService) {}

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  async assign(@Body() dto: AssignFacultyDto, @Request() req: AuthenticatedRequest) {
    return this.facultyAssignmentService.assignFacultyToDepartment(
      dto,
      req.user.id,
      req.user.collegeId!,
    );
  }

  @Get('by-department/:departmentId')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findByDepartment(@Param('departmentId') departmentId: string, @Request() req: AuthenticatedRequest) {
    return this.facultyAssignmentService.findAllByDepartment(departmentId, req.user.collegeId!);
  }

  @Get('by-faculty/:facultyUserId')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findByFaculty(@Param('facultyUserId') facultyUserId: string, @Request() req: AuthenticatedRequest) {
    return this.facultyAssignmentService.findAllByFaculty(facultyUserId, req.user.collegeId!);
  }

  @Get('my-assignments')
  @Roles(UserRole.FACULTY)
  async getMyAssignments(@Request() req: AuthenticatedRequest) {
    return this.facultyAssignmentService.findAllByFaculty(req.user.id, req.user.collegeId!);
  }

  @Get('permissions/:departmentId')
  @Roles(UserRole.FACULTY)
  async getMyPermissions(@Param('departmentId') departmentId: string, @Request() req: AuthenticatedRequest) {
    return this.facultyAssignmentService.getFacultyPermissions(req.user.id, departmentId);
  }

  @Put(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFacultyAssignmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyAssignmentService.updateAssignment(
      id,
      dto,
      req.user.id,
      req.user.collegeId!,
    );
  }

  @Delete()
  @Roles(UserRole.COLLEGE_ADMIN)
  async remove(@Body() dto: RemoveFacultyDto, @Request() req: AuthenticatedRequest) {
    return this.facultyAssignmentService.removeFromDepartment(
      dto.userId,
      dto.departmentId,
      req.user.id,
      req.user.collegeId!,
    );
  }
}
