import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
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
import { StudentPortalModule } from './student-portal/student-portal.module';
import { TopicsModule } from './topics/topics.module';
import { PackagesModule } from './packages/packages.module';
import { RatingsModule } from './ratings/ratings.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    EmailModule,
    BitflowOwnerModule,
    CompetencyModule,
    LearningUnitModule,
    StudentModule,
    CourseModule,
    ProgressModule,
    PublisherAdminModule,
    GovernanceModule,
    StudentPortalModule,
    TopicsModule,
    PackagesModule,
    RatingsModule,
    FilesModule,
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
