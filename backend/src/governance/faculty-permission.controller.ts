import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { FacultyPermissionService } from './faculty-permission.service';
import { CreateFacultyPermissionDto, UpdateFacultyPermissionDto } from './dto/faculty-permission.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    collegeId?: string;
    publisherId?: string;
  };
}

@Controller('governance/faculty-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacultyPermissionController {
  constructor(private readonly facultyPermissionService: FacultyPermissionService) {}

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  async create(@Body() dto: CreateFacultyPermissionDto, @Request() req: AuthenticatedRequest) {
    return this.facultyPermissionService.create(dto, req.user.id, req.user.collegeId!);
  }

  @Post('initialize-defaults')
  @Roles(UserRole.COLLEGE_ADMIN)
  async initializeDefaults(@Request() req: AuthenticatedRequest) {
    return this.facultyPermissionService.createDefaultPermissions(req.user.collegeId!, req.user.id);
  }

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.facultyPermissionService.findAll(req.user.collegeId!);
  }

  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.facultyPermissionService.findOne(id, req.user.collegeId!);
  }

  @Put(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFacultyPermissionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyPermissionService.update(id, dto, req.user.id, req.user.collegeId!);
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.facultyPermissionService.delete(id, req.user.id, req.user.collegeId!);
  }
}
