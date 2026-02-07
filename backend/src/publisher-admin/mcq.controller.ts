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
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { McqService } from './mcq.service';
import { FileUploadService } from './file-upload.service';
import {
  CreateMcqDto,
  UpdateMcqDto,
  GetMcqsQueryDto,
  VerifyMcqDto,
  McqResponseDto,
  McqStatsDto,
} from './dto/mcq.dto';

@Controller('publisher-admin/mcqs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PUBLISHER_ADMIN')
export class McqController {
  constructor(
    private mcqService: McqService,
    private fileUploadService: FileUploadService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateMcqDto,
    @Req() req: any,
  ): Promise<McqResponseDto> {
    return this.mcqService.create(dto, req.user.sub, req.user.publisherId);
  }

  @Get()
  async findAll(
    @Query() query: GetMcqsQueryDto,
    @Req() req: any,
  ) {
    return this.mcqService.findAll(query, req.user.publisherId);
  }

  @Get('stats')
  async getStats(@Req() req: any): Promise<McqStatsDto> {
    return this.mcqService.getStats(req.user.publisherId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<McqResponseDto> {
    return this.mcqService.findOne(id, req.user.publisherId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMcqDto,
    @Req() req: any,
  ): Promise<McqResponseDto> {
    return this.mcqService.update(id, dto, req.user.sub, req.user.publisherId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    await this.mcqService.delete(id, req.user.publisherId);
    return { message: 'MCQ deleted successfully' };
  }

  @Post(':id/verify')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyMcqDto,
    @Req() req: any,
  ): Promise<McqResponseDto> {
    return this.mcqService.verify(id, dto, req.user.sub, req.user.publisherId);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    return this.mcqService.bulkUploadFromCsv(
      file,
      req.user.sub,
      req.user.publisherId,
    );
  }

  /**
   * Upload image for MCQ (question or explanation image)
   * POST /api/publisher-admin/mcqs/upload-image
   */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const url = await this.fileUploadService.uploadFile(file, 'image');
    return { url };
  }
}
