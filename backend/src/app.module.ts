import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { TenantIsolationMiddleware } from './common/middleware/tenant-isolation.middleware';
import { SecurityValidationMiddleware } from './common/middleware/security-validation.middleware';
import { BitflowOwnerModule } from './bitflow-owner/bitflow-owner.module';
import { CompetencyModule } from './competency/competency.module';
import { LearningUnitModule } from './learning-unit/learning-unit.module';
import { StudentModule } from './student/student.module';
import { CourseModule } from './course/course.module';
import { ProgressModule } from './progress/progress.module';
import { PublisherAdminModule } from './publisher-admin/publisher-admin.module';
import { GovernanceModule } from './governance/governance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    BitflowOwnerModule,
    CompetencyModule,
    LearningUnitModule,
    StudentModule,
    CourseModule,
    ProgressModule,
    PublisherAdminModule,
    GovernanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security validation to all routes
    consumer
      .apply(SecurityValidationMiddleware)
      .forRoutes('*');
    
    // Apply tenant isolation after authentication
    consumer
      .apply(TenantIsolationMiddleware)
      .forRoutes('*');
  }
}
