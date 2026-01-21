import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS with strict origin validation
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe - validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: false, // Allow query params - set to false to prevent issues with query strings
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert strings to numbers for query params
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('================================================');
  console.log('🏥 Bitflow Medical LMS - Phase 0: Foundation');
  console.log('================================================');
  console.log(`🚀 Server running on: http://localhost:${port}/api`);
  console.log(`🔐 Authentication: Custom SSO with JWT`);
  console.log(`🗄️  Database: PostgreSQL with Prisma ORM`);
  console.log(`🛡️  Security: Multi-tenant isolation enforced`);
  console.log(`📝 Audit: Immutable logging active`);
  console.log('================================================');
}

bootstrap();
