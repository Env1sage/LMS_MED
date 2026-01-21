# Phase 1 (Updated) - Governance Model & Hierarchical System Architecture

## ✅ COMPLETION STATUS: COMPLETE

**Date Completed:** January 17, 2026

---

## 1. Implemented Features

### 1.1 Database Schema Updates

#### New Tables Created:
| Table | Purpose |
|-------|---------|
| `departments` | College departments with HOD assignments |
| `faculty_permissions` | Granular permission sets for faculty |
| `faculty_assignments` | Faculty-to-department assignments with permissions |
| `student_departments` | Students assigned to departments |

#### Updated Tables:
| Table | Changes |
|-------|---------|
| `users` | Added `departmentId` for HOD/Faculty scope |
| `learning_units` | New `ContentStatus` lifecycle, `competencyMappingStatus`, download controls |

### 1.2 New Enums

```typescript
// Content Lifecycle Status
enum ContentStatus {
  DRAFT              // Initial creation state
  PENDING_MAPPING    // Content uploaded but competency mapping incomplete
  ACTIVE             // Competency mapped, content available
  INACTIVE           // Deactivated by publisher
  SUSPENDED          // Suspended by Bitflow Owner
}

// Competency Mapping Status
enum CompetencyMappingStatus {
  PENDING            // No competencies mapped yet
  PARTIAL            // Some competencies mapped
  COMPLETE           // All required competencies mapped
}

// Department Status
enum DepartmentStatus {
  ACTIVE
  INACTIVE
}

// Faculty Assignment Status
enum FacultyStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
}
```

### 1.3 New Audit Actions

| Action | Purpose |
|--------|---------|
| `DEPARTMENT_CREATED` | Department created by College Admin |
| `DEPARTMENT_UPDATED` | Department details modified |
| `DEPARTMENT_DEACTIVATED` | Department deactivated |
| `HOD_ASSIGNED` | HOD assigned to department |
| `HOD_REMOVED` | HOD removed from department |
| `FACULTY_PERMISSION_CREATED` | New permission set created |
| `FACULTY_PERMISSION_UPDATED` | Permission set modified |
| `FACULTY_ASSIGNED_TO_DEPARTMENT` | Faculty assigned with permissions |
| `FACULTY_REMOVED_FROM_DEPARTMENT` | Faculty removed from department |
| `FACULTY_PERMISSIONS_CHANGED` | Faculty's permissions updated |
| `CONTENT_SUBMITTED_FOR_MAPPING` | Content submitted for competency mapping |
| `CONTENT_COMPETENCY_MAPPED` | Content competency mapping complete |
| `CONTENT_ACTIVATED` | Content activated after mapping |
| `CONTENT_DEACTIVATED` | Content deactivated by publisher |
| `CONTENT_SUSPENDED` | Content suspended by Bitflow Owner |
| `CONTENT_MAPPING_INCOMPLETE` | Content blocked due to incomplete mapping |
| `ROLE_BOUNDARY_VIOLATION` | Attempted action outside role scope |
| `CROSS_TENANT_ACCESS_ATTEMPT` | Attempted access to another college's data |
| `PERMISSION_DENIED` | Action denied due to insufficient permissions |
| `DATA_ISOLATION_BREACH_ATTEMPT` | Attempted data isolation breach |

---

## 2. New API Endpoints

### 2.1 Department Management (`/api/governance/departments`)

| Method | Endpoint | Role Required | Description |
|--------|----------|---------------|-------------|
| POST | `/` | COLLEGE_ADMIN | Create new department |
| GET | `/` | COLLEGE_ADMIN, COLLEGE_DEAN | List all departments |
| GET | `/my-departments` | COLLEGE_HOD | Get HOD's own departments |
| GET | `/:id` | COLLEGE_ADMIN, COLLEGE_DEAN, COLLEGE_HOD | Get department details |
| PUT | `/:id` | COLLEGE_ADMIN | Update department |
| PUT | `/:id/assign-hod` | COLLEGE_ADMIN | Assign HOD to department |
| DELETE | `/:id/remove-hod` | COLLEGE_ADMIN | Remove HOD from department |
| DELETE | `/:id` | COLLEGE_ADMIN | Deactivate department |

### 2.2 Faculty Permissions (`/api/governance/faculty-permissions`)

| Method | Endpoint | Role Required | Description |
|--------|----------|---------------|-------------|
| POST | `/` | COLLEGE_ADMIN | Create permission set |
| POST | `/initialize-defaults` | COLLEGE_ADMIN | Create default permission sets |
| GET | `/` | COLLEGE_ADMIN, COLLEGE_DEAN, COLLEGE_HOD | List all permission sets |
| GET | `/:id` | COLLEGE_ADMIN, COLLEGE_DEAN, COLLEGE_HOD | Get permission set details |
| PUT | `/:id` | COLLEGE_ADMIN | Update permission set |
| DELETE | `/:id` | COLLEGE_ADMIN | Delete permission set |

### 2.3 Faculty Assignments (`/api/governance/faculty-assignments`)

| Method | Endpoint | Role Required | Description |
|--------|----------|---------------|-------------|
| POST | `/` | COLLEGE_ADMIN | Assign faculty to department |
| GET | `/by-department/:departmentId` | COLLEGE_ADMIN, COLLEGE_DEAN, COLLEGE_HOD | List faculty in department |
| GET | `/by-faculty/:facultyUserId` | COLLEGE_ADMIN, COLLEGE_DEAN, COLLEGE_HOD | List faculty's assignments |
| GET | `/my-assignments` | FACULTY | Get own assignments |
| GET | `/permissions/:departmentId` | FACULTY | Get own permissions in department |
| PUT | `/:id` | COLLEGE_ADMIN | Update faculty assignment |
| DELETE | `/` | COLLEGE_ADMIN | Remove faculty from department |

---

## 3. Governance Guard Implementation

A new `GovernanceGuard` has been created to enforce:

1. **Tenant Isolation** - Colleges cannot access other colleges' data
2. **HOD Department Scope** - HODs can only access their assigned departments
3. **Faculty Permission Checks** - Faculty actions validated against their permissions
4. **Role Boundary Enforcement** - Actions blocked for inappropriate roles

Usage:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, GovernanceGuard)
@Governance({
  requireTenantIsolation: true,
  requireDepartmentScope: true,
  requiredFacultyPermission: 'canCreateCourses',
  restrictedFromRoles: [UserRole.STUDENT, UserRole.PUBLISHER_ADMIN],
})
```

---

## 4. Default Permission Sets

When `POST /api/governance/faculty-permissions/initialize-defaults` is called, these permission sets are created:

| Permission Set | Create Course | Edit Course | Delete Course | Create MCQ | Edit MCQ | Delete MCQ | View Analytics | Assign Students | Schedule Lectures | Upload Notes |
|---------------|---------------|-------------|---------------|------------|----------|------------|----------------|-----------------|-------------------|--------------|
| Full Access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assessment Only | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Course Manager | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Content Lifecycle (New Flow)

```
DRAFT → PENDING_MAPPING → ACTIVE → INACTIVE
                              ↓
                         SUSPENDED (by Bitflow Owner)
```

- **DRAFT**: Content just created
- **PENDING_MAPPING**: Uploaded but competencies not mapped (BLOCKS ACTIVATION)
- **ACTIVE**: Competencies mapped, content is live
- **INACTIVE**: Publisher deactivated content
- **SUSPENDED**: Bitflow Owner suspended content

---

## 6. Files Created/Modified

### New Files:
- `/backend/src/governance/governance.module.ts`
- `/backend/src/governance/department.service.ts`
- `/backend/src/governance/department.controller.ts`
- `/backend/src/governance/faculty-permission.service.ts`
- `/backend/src/governance/faculty-permission.controller.ts`
- `/backend/src/governance/faculty-assignment.service.ts`
- `/backend/src/governance/faculty-assignment.controller.ts`
- `/backend/src/governance/guards/governance.guard.ts`
- `/backend/src/governance/decorators/governance.decorator.ts`
- `/backend/src/governance/dto/department.dto.ts`
- `/backend/src/governance/dto/faculty-permission.dto.ts`
- `/backend/src/governance/dto/faculty-assignment.dto.ts`

### Modified Files:
- `/backend/prisma/schema.prisma` - New tables and enums
- `/backend/src/common/enums/index.ts` - New TypeScript enums
- `/backend/src/app.module.ts` - Added GovernanceModule

---

## 7. Authority Hierarchy Enforcement

| Level | Role | Permissions | Restrictions |
|-------|------|-------------|--------------|
| 1 | BITFLOW_OWNER | Platform governance, cross-college analytics | Cannot create courses, teach, or edit content |
| 2 | PUBLISHER_ADMIN | Content management, competency mapping | Cannot see students, assign content to students |
| 3 | COLLEGE_ADMIN/DEAN | User management, institutional analytics | Cannot edit publisher content, access other colleges |
| 4 | COLLEGE_HOD | Department-scoped view | Only sees own department |
| 5 | FACULTY | Course creation (per permissions), assessments | Subject-scoped, no downloads |
| 6 | STUDENT | Learning access, test attempts | No downloads, cannot skip mandatory content |

---

## 8. Next Steps (Phase 2-6)

Phase 1 provides the foundation. Next phases will:
- **Phase 2**: Enhance Bitflow Owner portal with global analytics
- **Phase 3**: Implement content lifecycle enforcement in Publisher portal
- **Phase 4**: Build College Admin portal with department management UI
- **Phase 5**: Implement Teacher portal with permission-based features
- **Phase 6**: Build Student portal with learning flow enforcement

---

## 9. Testing the API

```bash
# Login as College Admin
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aiimsnagpur.edu.in", "password": "Password123!"}' | jq -r '.accessToken')

# Initialize default permissions
curl -X POST http://localhost:3001/api/governance/faculty-permissions/initialize-defaults \
  -H "Authorization: Bearer $TOKEN"

# Create a department
curl -X POST http://localhost:3001/api/governance/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Anatomy", "code": "ANAT"}'

# List departments
curl http://localhost:3001/api/governance/departments \
  -H "Authorization: Bearer $TOKEN"
```
