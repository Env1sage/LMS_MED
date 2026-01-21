import { SetMetadata } from '@nestjs/common';
import { GovernanceRequirement } from '../guards/governance.guard';

/**
 * Phase 1 Governance Decorator
 * 
 * Use this decorator to apply governance rules to controller methods.
 * 
 * @example
 * // Require tenant isolation
 * @Governance({ requireTenantIsolation: true })
 * 
 * // Require department scope for HOD
 * @Governance({ requireDepartmentScope: true })
 * 
 * // Require faculty permission
 * @Governance({ requiredFacultyPermission: 'canCreateCourses' })
 * 
 * // Restrict from certain roles
 * @Governance({ restrictedFromRoles: [UserRole.STUDENT, UserRole.PUBLISHER_ADMIN] })
 */
export const Governance = (requirements: GovernanceRequirement) =>
  SetMetadata('governance', requirements);
