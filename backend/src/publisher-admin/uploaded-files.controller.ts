import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadedFilesService } from './uploaded-files.service';

@Controller('publisher-admin/uploaded-files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PUBLISHER_ADMIN')
export class UploadedFilesController {
  constructor(private uploadedFilesService: UploadedFilesService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.uploadedFilesService.findAll(req.user.publisherId);
  }

  @Post()
  async create(
    @Body() body: {
      fileName: string;
      originalName: string;
      fileUrl: string;
      fileCategory: string;
      fileSize: number;
      mimeType: string;
    },
    @Req() req: any,
  ) {
    return this.uploadedFilesService.create({
      publisherId: req.user.publisherId,
      ...body,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.uploadedFilesService.remove(id, req.user.publisherId);
  }
}
