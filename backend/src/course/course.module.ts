import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { FacultyAnalyticsController } from './faculty-analytics.controller';
import { FacultyAnalyticsService } from './faculty-analytics.service';
import { SelfPacedController } from './self-paced.controller';
import { SelfPacedService } from './self-paced.service';
import { StepCompletionService } from './step-completion.service';
import { LearningSecurityService } from './learning-security.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourseController, FacultyAnalyticsController, SelfPacedController],
  providers: [
    CourseService,
    FacultyAnalyticsService,
    SelfPacedService,
    StepCompletionService,
    LearningSecurityService,
  ],
  exports: [CourseService, FacultyAnalyticsService, SelfPacedService, StepCompletionService, LearningSecurityService],
})
export class CourseModule {}

