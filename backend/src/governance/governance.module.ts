import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { FacultyPermissionService } from './faculty-permission.service';
import { FacultyPermissionController } from './faculty-permission.controller';
import { FacultyAssignmentService } from './faculty-assignment.service';
import { FacultyAssignmentController } from './faculty-assignment.controller';
import { GovernanceGuard } from './guards/governance.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    DepartmentController,
    FacultyPermissionController,
    FacultyAssignmentController,
  ],
  providers: [
    DepartmentService,
    FacultyPermissionService,
    FacultyAssignmentService,
    GovernanceGuard,
  ],
  exports: [
    DepartmentService,
    FacultyPermissionService,
    FacultyAssignmentService,
    GovernanceGuard,
  ],
})
export class GovernanceModule {}
