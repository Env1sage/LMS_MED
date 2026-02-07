import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { FacultyPermissionService } from './faculty-permission.service';
import { FacultyPermissionController } from './faculty-permission.controller';
import { FacultyAssignmentService } from './faculty-assignment.service';
import { FacultyAssignmentController } from './faculty-assignment.controller';
import { FacultyUserService } from './faculty-user.service';
import { FacultyUserController } from './faculty-user.controller';
import { CollegeProfileService } from './college-profile.service';
import { CollegeProfileController } from './college-profile.controller';
import { CourseAnalyticsService } from './course-analytics.service';
import { CourseAnalyticsController } from './course-analytics.controller';
// Notification module removed per CBME spec (No notifications module)
import { GovernanceGuard } from './guards/governance.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    DepartmentController,
    FacultyPermissionController,
    FacultyAssignmentController,
    FacultyUserController,
    CollegeProfileController,
    CourseAnalyticsController,
    // NotificationController removed per spec
  ],
  providers: [
    DepartmentService,
    FacultyPermissionService,
    FacultyAssignmentService,
    FacultyUserService,
    CollegeProfileService,
    CourseAnalyticsService,
    // NotificationService removed per spec
    GovernanceGuard,
  ],
  exports: [
    DepartmentService,
    FacultyPermissionService,
    FacultyAssignmentService,
    FacultyUserService,
    CollegeProfileService,
    CourseAnalyticsService,
    // NotificationService removed per spec
    GovernanceGuard,
  ],
})
export class GovernanceModule {}
