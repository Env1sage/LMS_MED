import { Module } from '@nestjs/common';
import { McqController } from './mcq.controller';
import { McqService } from './mcq.service';
import { FileUploadService } from './file-upload.service';
import { PublisherProfileController } from './publisher-profile.controller';
import { PublisherProfileService } from './publisher-profile.service';
import { PublisherContractGuard } from '../auth/guards/publisher-contract.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [McqController, PublisherProfileController],
  providers: [McqService, FileUploadService, PublisherProfileService, PublisherContractGuard],
  exports: [McqService, FileUploadService, PublisherProfileService],
})
export class PublisherAdminModule {}
