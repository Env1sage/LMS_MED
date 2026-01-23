import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PublisherProfileService } from './publisher-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PublisherContractGuard } from '../auth/guards/publisher-contract.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { UpdatePublisherProfileDto, ChangePasswordDto, PublisherProfileResponseDto } from './dto/profile.dto';

@Controller('publisher/profile')
@UseGuards(JwtAuthGuard, RolesGuard, PublisherContractGuard)
@Roles(UserRole.PUBLISHER_ADMIN)
export class PublisherProfileController {
  constructor(private readonly profileService: PublisherProfileService) {}

  /**
   * Get publisher profile
   * Returns both editable and read-only fields
   */
  @Get()
  async getProfile(@CurrentUser('userId') userId: string): Promise<PublisherProfileResponseDto> {
    return this.profileService.getProfile(userId);
  }

  /**
   * Update publisher profile
   * Only allows updating: companyName, contactPerson, contactEmail, physicalAddress
   * Read-only fields (contract dates, status, etc.) cannot be modified here
   */
  @Put()
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePublisherProfileDto,
  ): Promise<PublisherProfileResponseDto> {
    return this.profileService.updateProfile(userId, dto);
  }

  /**
   * Change password
   * Requires current password verification
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.profileService.changePassword(userId, dto);
  }
}
