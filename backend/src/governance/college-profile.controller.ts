import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CollegeProfileService } from './college-profile.service';
import { UpdateCollegeProfileDto } from './dto/college-profile.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    collegeId?: string;
    publisherId?: string;
  };
}

@Controller('college/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollegeProfileController {
  constructor(private readonly collegeProfileService: CollegeProfileService) {}

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_DEAN, UserRole.COLLEGE_HOD, UserRole.FACULTY)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.collegeProfileService.getCollegeProfile(req.user.collegeId!);
  }

  @Put()
  @Roles(UserRole.COLLEGE_ADMIN)
  async updateProfile(
    @Body() dto: UpdateCollegeProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collegeProfileService.updateCollegeProfile(
      req.user.collegeId!,
      dto,
      req.user.id,
    );
  }
}
