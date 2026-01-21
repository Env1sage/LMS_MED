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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto, AssignHodDto } from './dto/department.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    collegeId?: string;
    publisherId?: string;
  };
}

@Controller('governance/departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  async create(@Body() dto: CreateDepartmentDto, @Request() req: AuthenticatedRequest) {
    return this.departmentService.create(dto, req.user.id, req.user.collegeId!);
  }

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.departmentService.findAll(req.user.collegeId!);
  }

  @Get('my-departments')
  @Roles(UserRole.COLLEGE_HOD)
  async findMyDepartments(@Request() req: AuthenticatedRequest) {
    return this.departmentService.findForHod(req.user.id, req.user.collegeId!);
  }

  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.departmentService.findOne(id, req.user.collegeId!);
  }

  @Put(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.departmentService.update(id, dto, req.user.id, req.user.collegeId!);
  }

  @Put(':id/assign-hod')
  @Roles(UserRole.COLLEGE_ADMIN)
  async assignHod(
    @Param('id') id: string,
    @Body() dto: AssignHodDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.departmentService.assignHod(id, dto, req.user.id, req.user.collegeId!);
  }

  @Delete(':id/remove-hod')
  @Roles(UserRole.COLLEGE_ADMIN)
  async removeHod(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.departmentService.removeHod(id, req.user.id, req.user.collegeId!);
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async deactivate(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.departmentService.deactivate(id, req.user.id, req.user.collegeId!);
  }
}
