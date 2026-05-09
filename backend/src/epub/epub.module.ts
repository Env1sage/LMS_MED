import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EpubService } from './epub.service';
import { EpubController } from './epub.controller';
import { SecurityController } from './security.controller';
import { AnnotationsController } from './annotations.controller';
import { OfflineController } from './offline.controller';
import { WatermarkService } from './watermark.service';
import { AnnotationsService } from './annotations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production',
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    EpubController,
    SecurityController,
    AnnotationsController,
    OfflineController,
  ],
  providers: [EpubService, WatermarkService, AnnotationsService],
  exports: [EpubService, WatermarkService, AnnotationsService],
})
export class EpubModule {}
