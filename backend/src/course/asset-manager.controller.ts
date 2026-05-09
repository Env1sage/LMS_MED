import {
  Controller, Get, Post, Delete, Query, Param, UseGuards,
  UploadedFile, UseInterceptors, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AssetManagerService } from './asset-manager.service';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetManagerController {
  constructor(private readonly svc: AssetManagerService) {}

  /** Upload a file */
  @Post('upload')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string; description?: string; isPublic?: string },
  ) {
    return this.svc.upload(user.userId, user.collegeId, file, {
      folder: body.folder,
      description: body.description,
      isPublic: body.isPublic === 'true',
    });
  }

  /** List my assets */
  @Get()
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER)
  async list(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('folder') folder?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.list(user.userId, user.role, user.collegeId, { type, folder, search });
  }

  /** Get storage stats */
  @Get('stats')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER)
  async stats(@CurrentUser() user: any) {
    return this.svc.getStats(user.userId, user.role, user.collegeId);
  }

  /** Get single asset */
  @Get(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.userId, user.role);
  }

  /** Generate a signed URL for file access */
  @Get(':id/signed-url')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER, UserRole.STUDENT)
  async getSignedUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getSignedUrl(id, user.userId, user.role);
  }

  /** Delete an asset */
  @Delete(':id')
  @Roles(UserRole.FACULTY, UserRole.COLLEGE_ADMIN, UserRole.PUBLISHER_ADMIN, UserRole.BITFLOW_OWNER)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.userId, user.role);
  }
}
