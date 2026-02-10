import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { FacultyAnalyticsController } from './faculty-analytics.controller';
import { FacultyAnalyticsService } from './faculty-analytics.service';
import { SelfPacedController } from './self-paced.controller';
import { SelfPacedService } from './self-paced.service';
import { StepCompletionService } from './step-completion.service';
import { LearningSecurityService } from './learning-security.service';
import { FacultyAssignmentMgmtController } from './faculty-assignment-mgmt.controller';
import { FacultyAssignmentMgmtService } from './faculty-assignment-mgmt.service';
import { FacultyNotificationController } from './faculty-notification.controller';
import { FacultyNotificationService } from './faculty-notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourseController, FacultyAnalyticsController, SelfPacedController, FacultyAssignmentMgmtController, FacultyNotificationController],
  providers: [
    CourseService,
    FacultyAnalyticsService,
    SelfPacedService,
    StepCompletionService,
    LearningSecurityService,
    FacultyAssignmentMgmtService,
    FacultyNotificationService,
  ],
  exports: [CourseService, FacultyAnalyticsService, SelfPacedService, StepCompletionService, LearningSecurityService, FacultyAssignmentMgmtService, FacultyNotificationService],
})
export class CourseModule {}

