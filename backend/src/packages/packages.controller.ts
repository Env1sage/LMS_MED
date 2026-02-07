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
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto, AssignPackageToCollegeDto, UpdatePackageAssignmentDto } from './dto/packages.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  // =====================================================
  // PACKAGE ASSIGNMENTS (Bitflow Owner only)
  // These routes must come BEFORE :id routes to prevent conflicts
  // =====================================================

  /**
   * Get all package assignments
   */
  @Get('assignments/all')
  @Roles(UserRole.BITFLOW_OWNER)
  async getAllAssignments() {
    return this.packagesService.getAllAssignments();
  }

  /**
   * Get packages assigned to a specific college
   */
  @Get('assignments/college/:collegeId')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.COLLEGE_ADMIN)
  async getCollegePackages(@Param('collegeId') collegeId: string, @Request() req: any) {
    // College Admin can only view their own college's packages
    if (req.user.role === UserRole.COLLEGE_ADMIN && req.user.collegeId !== collegeId) {
      return [];
    }
    return this.packagesService.getCollegePackages(collegeId);
  }

  /**
   * Get available content for a college based on assigned packages
   * Used by Faculty when creating courses - ensures content restriction
   */
  @Get('content/college/:collegeId')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.COLLEGE_ADMIN, UserRole.FACULTY, UserRole.COLLEGE_HOD)
  async getCollegeAvailableContent(@Param('collegeId') collegeId: string, @Request() req: any) {
    // Faculty/HOD can only access their own college's content
    if ([UserRole.FACULTY, UserRole.COLLEGE_HOD, UserRole.COLLEGE_ADMIN].includes(req.user.role)) {
      if (req.user.collegeId !== collegeId) {
        return { packages: [], learningUnits: [], subjects: [], message: 'Access denied' };
      }
    }
    return this.packagesService.getCollegeAvailableContent(collegeId);
  }

  /**
   * Assign a package to a college
   */
  @Post('assignments')
  @Roles(UserRole.BITFLOW_OWNER)
  async assignToCollege(@Body() dto: AssignPackageToCollegeDto, @Request() req: any) {
    return this.packagesService.assignToCollege(dto, req.user.userId);
  }

  /**
   * Update a package assignment
   */
  @Put('assignments/:id')
  @Roles(UserRole.BITFLOW_OWNER)
  async updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdatePackageAssignmentDto,
    @Request() req: any,
  ) {
    return this.packagesService.updateAssignment(id, dto, req.user.userId);
  }

  /**
   * Remove (cancel) a package assignment
   */
  @Delete('assignments/:id')
  @Roles(UserRole.BITFLOW_OWNER)
  async removeAssignment(@Param('id') id: string, @Request() req: any) {
    return this.packagesService.removeAssignment(id, req.user.userId);
  }

  // =====================================================
  // PACKAGE MANAGEMENT
  // =====================================================

  /**
   * Create a new package (Publisher Admin)
   */
  @Post()
  @Roles(UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER)
  async create(@Body() dto: CreatePackageDto, @Request() req: any) {
    return this.packagesService.create(dto, req.user.userId, req.user.publisherId);
  }

  /**
   * Get all packages (Bitflow Owner sees all, Publisher Admin sees own)
   */
  @Get()
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN)
  async findAll(@Request() req: any) {
    if (req.user.role === UserRole.BITFLOW_OWNER) {
      return this.packagesService.findAll();
    }
    return this.packagesService.findByPublisher(req.user.publisherId);
  }

  /**
   * Get a single package by ID
   */
  @Get(':id')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN, UserRole.COLLEGE_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  /**
   * Update a package
   */
  @Put(':id')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePackageDto,
    @Request() req: any,
  ) {
    const publisherId = req.user.role === UserRole.PUBLISHER_ADMIN ? req.user.publisherId : undefined;
    return this.packagesService.update(id, dto, req.user.userId, publisherId);
  }

  /**
   * Delete (deactivate) a package
   */
  @Delete(':id')
  @Roles(UserRole.BITFLOW_OWNER, UserRole.PUBLISHER_ADMIN)
  async delete(@Param('id') id: string, @Request() req: any) {
    const publisherId = req.user.role === UserRole.PUBLISHER_ADMIN ? req.user.publisherId : undefined;
    return this.packagesService.delete(id, req.user.userId, publisherId);
  }
}
