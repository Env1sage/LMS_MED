import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { FacultyUserService } from './faculty-user.service';
import { CreateFacultyUserDto } from './dto/faculty-user.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    id?: string;
    email: string;
    role: UserRole;
    collegeId?: string;
    publisherId?: string;
  };
}

@Controller('governance/faculty-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacultyUserController {
  constructor(private readonly facultyUserService: FacultyUserService) {}

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD)
  async findAll(@Request() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.COLLEGE_HOD) {
      return this.facultyUserService.findFacultyInHodDepartment(req.user.userId, req.user.collegeId!);
    }
    return this.facultyUserService.findAllFacultyInCollege(req.user.collegeId!);
  }

  @Get('hod-students')
  @Roles(UserRole.COLLEGE_HOD)
  async getHodStudents(@Request() req: AuthenticatedRequest) {
    const query = (req as any).query || {};
    return this.facultyUserService.findStudentsInHodDepartment(req.user.userId, req.user.collegeId!, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search || undefined,
      status: query.status || undefined,
      currentAcademicYear: query.currentAcademicYear || undefined,
    });
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async create(
    @Body() dto: CreateFacultyUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyUserService.createFacultyUser(
      dto,
      req.user.userId,
      req.user.collegeId!,
    );
  }

  @Post('bulk-upload')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const name = file.originalname.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      throw new BadRequestException('File must be a CSV or Excel (.xlsx/.xls) file');
    }
    return this.facultyUserService.bulkUploadFromCSV(
      file.buffer,
      file.originalname,
      req.user.userId,
      req.user.collegeId!,
    );
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyUserService.deleteFacultyUser(
      id,
      req.user.userId,
      req.user.collegeId!,
    );
  }

  @Post(':id/reset-credentials')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async resetCredentials(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyUserService.resetFacultyCredentials(
      id,
      req.user.userId,
      req.user.collegeId!,
    );
  }

  @Post(':id/assign-task')
  @Roles(UserRole.COLLEGE_HOD, UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN)
  async assignTask(
    @Param('id') id: string,
    @Body() body: { taskType: string; title: string; description: string; dueDate?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyUserService.assignTaskToFaculty(
      id,
      body,
      req.user.userId,
      req.user.collegeId!,
    );
  }
}
