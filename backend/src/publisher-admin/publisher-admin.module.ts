import { Module } from '@nestjs/common';
import { McqController } from './mcq.controller';
import { McqService } from './mcq.service';
import { FileUploadService } from './file-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [McqController],
  providers: [McqService, FileUploadService],
  exports: [McqService, FileUploadService],
})
export class PublisherAdminModule {}
