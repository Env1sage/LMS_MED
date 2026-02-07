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
    id: string;
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
    return this.facultyUserService.findAllFacultyInCollege(req.user.collegeId!);
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  async create(
    @Body() dto: CreateFacultyUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyUserService.createFacultyUser(
      dto,
      req.user.id,
      req.user.collegeId!,
    );
  }

  @Post('bulk-upload')
  @Roles(UserRole.COLLEGE_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }
    return this.facultyUserService.bulkUploadFromCSV(
      file.buffer,
      req.user.id,
      req.user.collegeId!,
    );
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.facultyUserService.deleteFacultyUser(
      id,
      req.user.id,
      req.user.collegeId!,
    );
  }
}
