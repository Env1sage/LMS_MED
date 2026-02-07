# BITFLOW MEDICAL LMS - COMPLETE PROJECT GUIDE
## Comprehensive Project Completion Documentation

**Last Updated:** February 4, 2026  
**Project Status:** ✅ FULLY OPERATIONAL  
**Database:** Fully seeded with transparent, interconnected data

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema Overview](#database-schema-overview)
5. [Complete Feature List](#complete-feature-list)
6. [Portal-Specific Features](#portal-specific-features)
7. [API Documentation](#api-documentation)
8. [Data Transparency & Relationships](#data-transparency--relationships)
9. [Setup & Installation](#setup--installation)
10. [Testing Guide](#testing-guide)
11. [Login Credentials](#login-credentials)
12. [Known Issues & Limitations](#known-issues--limitations)
13. [Future Enhancements](#future-enhancements)

---

## EXECUTIVE SUMMARY

### What is Bitflow Medical LMS?

Bitflow Medical LMS is a comprehensive Learning Management System designed specifically for medical education institutions. It provides a multi-tenant platform where:

- **Bitflow Owners** manage the entire platform
- **Publishers** create and manage educational content (books, videos, MCQs)
- **College Admins** manage their institutions, departments, and faculty
- **Faculty** create courses, manage students, and track progress
- **Students** access courses, learning materials, and take assessments

### Current Implementation Status

✅ **Phase 0-5 Complete**  
✅ **7 User Roles Implemented**  
✅ **50+ API Endpoints Active**  
✅ **12+ Frontend Pages Deployed**  
✅ **Complete Database with Realistic Data**  
✅ **Multi-tenant Architecture Operational**

### Key Statistics

| Entity | Count | Description |
|--------|-------|-------------|
| **Bitflow Owner** | 1 | Platform super admin |
| **Publishers** | 3 | Elsevier, Springer, Wiley |
| **Colleges** | 3 | AIIMS Nagpur, AIIMS Delhi, KMC Manipal |
| **Departments** | 24 | 8 per college (Anatomy, Physiology, etc.) |
| **Faculty** | 12 | 4 per college |
| **Students** | 45 | 15 per college (distributed across Years 1-3) |
| **Learning Units** | 45 | Books, Videos, Notes |
| **MCQs** | 60 | Multiple subjects and difficulty levels |
| **Courses** | 15 | 5 per college with learning flows |
| **Packages** | 6 | 2 per publisher |

---

## SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                          │
│                      http://localhost:3000                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │
│  │ Bitflow Owner  │  │   Publisher    │  │  College Admin  │   │
│  │   Dashboard    │  │     Portal     │  │     Portal      │   │
│  └────────────────┘  └────────────────┘  └─────────────────┘   │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │    Faculty     │  │     Student    │                         │
│  │    Portal      │  │     Portal     │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                   REST API (JWT Auth)
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (NestJS)                             │
│                   http://localhost:3001/api                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  MODULES:                                                         │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐            │
│  │    Auth     │ │  Governance  │ │    Course     │            │
│  │   Module    │ │    Module    │ │    Module     │            │
│  └─────────────┘ └──────────────┘ └───────────────┘            │
│                                                                   │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐            │
│  │   Student   │ │  Competency  │ │   Publisher   │            │
│  │   Module    │ │    Module    │ │     Admin     │            │
│  └─────────────┘ └──────────────┘ └───────────────┘            │
│                                                                   │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐            │
│  │   Progress  │ │    Topics    │ │    Packages   │            │
│  │   Module    │ │    Module    │ │    Module     │            │
│  └─────────────┘ └──────────────┘ └───────────────┘            │
│                                                                   │
│  MIDDLEWARE & GUARDS:                                             │
│  • JWT Authentication Guard                                       │
│  • Role-based Authorization Guard                                 │
│  • Tenant Isolation Middleware                                    │
│  • Audit Logging Interceptor                                      │
│                                                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                     Prisma ORM v7
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                   PostgreSQL DATABASE                             │
│                    Database: bitflow_lms                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CORE TABLES (30+ models):                                        │
│  • users                    • colleges                            │
│  • publishers              • students                            │
│  • departments             • faculty_assignments                 │
│  • courses                 • learning_units                      │
│  • mcqs                    • competencies                        │
│  • topics                  • packages                            │
│  • course_assignments      • student_progress                    │
│  • step_progress           • test_attempts                       │
│  • notifications           • audit_logs                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Student Takes a Course

```
1. Student logs in → JWT token generated
2. Student views assigned courses → Backend filters by collegeId + studentId
3. Student clicks on course → Course details + learning flow loaded
4. Student starts learning unit → Access log created, session token generated
5. Student completes step → step_progress updated, prerequisite check
6. Student completes all steps → student_progress updated to COMPLETED
7. Faculty views analytics → Aggregated data from step_progress
8. College admin views course analytics → Cross-course comparison data
```

---

## TECHNOLOGY STACK

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | NestJS | 10.x | RESTful API framework |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Database** | PostgreSQL | 15+ | Relational database |
| **ORM** | Prisma | 7.x | Database access layer |
| **Authentication** | JWT + Passport | Latest | Secure token-based auth |
| **Validation** | class-validator | Latest | DTO validation |
| **Password** | bcrypt | Latest | Password hashing |
| **File Upload** | Multer | Latest | File handling |
| **Runtime** | Node.js | 18+ | JavaScript runtime |

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 19.x | UI library |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Routing** | React Router | 6.x | Client-side routing |
| **HTTP Client** | Axios | Latest | API communication |
| **State** | React Hooks | Built-in | State management |
| **Styling** | CSS3 + Flexbox | - | Responsive design |
| **Charts** | Recharts | Latest | Data visualization |

### Development Tools

- **Package Manager:** npm
- **Version Control:** Git
- **IDE:** Visual Studio Code
- **API Testing:** Postman / cURL
- **Database Client:** pgAdmin / psql

---

## DATABASE SCHEMA OVERVIEW

### Core Entity Relationships

```
┌────────────────┐
│   BITFLOW      │
│     OWNER      │
└────────┬───────┘
         │
         ├──────────────────────────────────┐
         │                                  │
┌────────▼───────┐                 ┌───────▼────────┐
│   PUBLISHERS   │                 │    COLLEGES    │
└────────┬───────┘                 └───────┬────────┘
         │                                 │
         ├─────────┬────────┐              ├──────────┬──────────┐
         │         │        │              │          │          │
    ┌────▼───┐ ┌──▼────┐ ┌─▼────┐  ┌─────▼─────┐ ┌─▼──────┐ ┌─▼──────┐
    │Learning│ │  MCQs │ │Packages│ │Departments│ │ Faculty│ │Students│
    │ Units  │ └───────┘ └────────┘ └───────────┘ └────┬───┘ └───┬────┘
    └────┬───┘                                          │          │
         │                                              │          │
         │                                         ┌────▼──────────▼─┐
         │                                         │     COURSES     │
         │                                         └────┬────────────┘
         │                                              │
         └──────────────────────────────────────────────┤
                                                        │
                                              ┌─────────▼─────────┐
                                              │ LEARNING FLOW     │
                                              │     STEPS         │
                                              └─────────┬─────────┘
                                                        │
                                              ┌─────────▼─────────┐
                                              │  STEP PROGRESS    │
                                              │  (Student x Step) │
                                              └───────────────────┘
```

### Key Database Models (30 total)

1. **User Management**
   - `users` - All system users with roles
   - `refresh_tokens` - JWT refresh tokens
   - `user_sessions` - Active user sessions
   - `security_policies` - Security configurations

2. **Institution Management**
   - `colleges` - Educational institutions
   - `departments` - College departments
   - `faculty_assignments` - Faculty-Department mapping
   - `faculty_permissions` - Role-based permissions
   - `students` - Student profiles
   - `student_departments` - Student-Department mapping

3. **Content Management**
   - `publishers` - Content publishers
   - `learning_units` - Educational content (books, videos, notes)
   - `mcqs` - Multiple choice questions
   - `topics` - Subject topics
   - `competencies` - Learning competencies (MCI standards)
   - `packages` - Content packages
   - `college_packages` - Package assignments to colleges

4. **Course & Learning**
   - `courses` - Faculty-created courses
   - `course_competencies` - Course-Competency mapping
   - `learning_flow_steps` - Sequential learning path
   - `course_assignments` - Student-Course assignments

5. **Progress Tracking**
   - `student_progress` - Overall course progress
   - `step_progress` - Individual step completion
   - `tests` - Assessments/exams
   - `test_attempts` - Student test attempts
   - `test_questions` - Test question mapping
   - `student_answers` - Student responses

6. **System & Audit**
   - `audit_logs` - System activity logs
   - `notifications` - User notifications
   - `learning_unit_access_logs` - Content access tracking

### Enum Types

```typescript
// User Roles
enum UserRole {
  BITFLOW_OWNER
  PUBLISHER_ADMIN
  COLLEGE_ADMIN
  DEAN
  HOD
  FACULTY
  STUDENT
}

// Academic Years
enum AcademicYear {
  YEAR_1
  YEAR_2
  YEAR_3_MINOR
  YEAR_3_MAJOR
  YEAR_4
  INTERNSHIP
}

// Learning Unit Types
enum LearningUnitType {
  BOOK
  VIDEO
  LECTURE
  NOTES
  PRESENTATION
}

// Difficulty Levels (MCI Standard)
enum DifficultyLevel {
  K   // Knowledge
  KH  // Knowledge Higher
  S   // Skill
  SH  // Skill Higher
  P   // Proficiency
}

// Status Types
enum CourseStatus { DRAFT, PUBLISHED, ARCHIVED }
enum ContentStatus { DRAFT, ACTIVE, INACTIVE }
enum AssignmentStatus { ASSIGNED, IN_PROGRESS, COMPLETED }
enum StepStatus { NOT_STARTED, IN_PROGRESS, COMPLETED }
```

---

## COMPLETE FEATURE LIST

### ✅ Implemented Features

#### 1. **Authentication & Authorization**
- JWT-based authentication
- Refresh token mechanism
- Password hashing with bcrypt
- Role-based access control (7 roles)
- Login/logout functionality
- Password change
- Session management

#### 2. **Bitflow Owner Portal**
- Platform-wide dashboard
- Publisher management (CRUD)
- College management (CRUD)
- User management across all tenants
- System-wide analytics
- Audit log viewing
- Package approvals

#### 3. **Publisher Admin Portal**
- Publisher profile management
- Learning unit management (CRUD)
  - Upload books (PDF)
  - Upload videos (MP4)
  - Upload notes
  - Set competency mappings
  - Configure security settings (watermark, DRM)
- MCQ management (CRUD)
  - Create individual MCQs
  - Bulk upload via CSV
  - Image support for questions
  - Competency mapping
  - Difficulty levels & Bloom's taxonomy
- Package creation and management
- Content analytics
- Revenue dashboard (planned)

#### 4. **College Admin Portal**
- College profile management
- Department management (CRUD)
- Faculty management
  - Create faculty users
  - Assign to departments
  - Set permissions
- Student management
  - Create students (individual & bulk)
  - Upload via CSV
  - Department assignment
  - Batch management
  - Reset passwords
- Course analytics **NEW**
  - Overview statistics
  - Course comparison charts
  - Performance metrics
- Dashboard with statistics
  - Clickable stat cards **NEW**
  - Student list modals **NEW**
  - Top performers tracking
  - Students needing attention
- Package subscriptions

#### 5. **Faculty Portal**
- Course management
  - Create courses
  - Add learning flow steps
  - Link learning units
  - Set prerequisites
  - Mandatory step enforcement
- Student assignment to courses
- Progress tracking
  - Overall course progress
  - Individual step progress
  - Completion percentages
- Analytics dashboard
  - Course analytics
  - Student performance
  - MCQ statistics
  - Batch summary
  - Individual student reports
  - CSV export
- Test/Assessment creation
- Competency-based filtering

#### 6. **Student Portal**
- Dashboard with assigned courses
- Learning flow navigation
- Content access
  - Books (PDF viewer)
  - Videos (streaming)
  - Notes
  - Watermarked access
- Step completion tracking
- Prerequisite enforcement
- Test taking
- Progress visualization
- Performance analytics
- Competency achievement tracking

#### 7. **Content Security**
- Watermarking for all content
- Session-based access tokens
- DRM controls
- Access logging
- Violation detection
- IP & device tracking

#### 8. **Competency Framework**
- MCI competency standards
- Hierarchical structure
- Subject mapping
- Domain classification
- Academic level mapping
- Course-competency linking
- Progress tracking by competency

#### 9. **Progress Tracking System**
- Real-time progress updates
- Step-by-step completion
- Prerequisite blocking
- Mandatory vs optional steps
- Percentage calculations
- Time tracking
- Completion certificates (planned)

#### 10. **Notification System**
- User notifications
- Department-wide announcements
- Course updates
- Assignment notifications
- System alerts

#### 11. **Analytics & Reporting**
- Student performance reports
- Course completion rates
- Faculty analytics
- College-wide statistics
- Course comparison **NEW**
- Top performers identification **NEW**
- At-risk student detection **NEW**
- MCQ analytics
- Content usage statistics
- CSV exports

#### 12. **Audit & Compliance**
- Complete audit trail
- User action logging
- Access logs
- Security events
- Compliance reporting
- Data export

---

## PORTAL-SPECIFIC FEATURES

### 1. Bitflow Owner Dashboard
**URL:** http://localhost:3000/dashboard  
**Role:** BITFLOW_OWNER

**Features:**
- Platform overview with total publishers, colleges, users
- Publisher management
  - Add new publishers
  - Edit publisher details
  - Activate/deactivate publishers
  - Contract management
- College management
  - Add new colleges
  - Edit college details
  - Manage college status
  - View college statistics
- System-wide audit logs
- Global analytics

**Key Screens:**
- Main dashboard with metrics
- Publisher list & forms
- College list & forms
- Audit log viewer

---

### 2. Publisher Admin Portal
**URL:** http://localhost:3000/publisher-admin  
**Role:** PUBLISHER_ADMIN

**Features:**
- Publisher profile management
- Learning unit management
  - Create books, videos, notes
  - Upload files (PDF, MP4)
  - Set metadata (subject, topic, difficulty)
  - Map to competencies
  - Configure security (watermark, session expiry)
  - Publish/unpublish content
- MCQ management
  - Create MCQs with rich text
  - Add images to questions
  - Bulk upload via CSV
  - Set difficulty levels
  - Bloom's taxonomy classification
  - Competency mapping
  - Publish/verify MCQs
- Package creation
  - Bundle learning units
  - Set pricing (planned)
  - Assign to colleges
- Content analytics
  - Usage statistics
  - Popular content
  - Student feedback (planned)

**Key Screens:**
- Dashboard with content statistics
- Learning unit list & creation form
- MCQ list & creation form
- Bulk upload interface
- Package management
- Publisher profile settings

---

### 3. College Admin Portal
**URL:** http://localhost:3000/college-admin  
**Role:** COLLEGE_ADMIN

**Features:**
- College profile management
- Department management
  - Create departments
  - Assign HODs
  - Set department codes
  - Manage department status
- Faculty management
  - Create faculty users
  - Assign to departments
  - Set teaching permissions
  - Assign subjects
- Student management
  - Create individual students
  - Bulk upload via CSV
  - Assign to departments
  - Set academic year
  - Reset passwords
  - Activate/deactivate students
  - Promote to next year
- Dashboard statistics **ENHANCED**
  - Total students/faculty/departments
  - Active courses count
  - Overall completion rate
  - **Clickable stat cards** showing:
    - Top performers (>80% progress)
    - Students needing attention (<50% progress)
    - Recently active students
  - **Student list modal** with filtering
  - **Progress bar visualization** with hover effects
- Course analytics **NEW**
  - Course overview with metrics
  - Course comparison charts
  - Detailed course performance
  - Filter by academic year
  - Export capabilities

**Key Screens:**
- Main dashboard with statistics & cards
- Department management page
- Faculty management page
- Student management page
- Student bulk upload
- Course analytics page **NEW**
- College profile settings

---

### 4. Faculty Portal
**URL:** http://localhost:3000/faculty  
**Role:** FACULTY

**Features:**
- Course creation & management
  - Create new courses
  - Set course details (title, description, academic year)
  - Add learning flow steps
  - Link learning units to steps
  - Define prerequisite chains
  - Mark steps as mandatory
  - Publish courses
- Student assignment
  - Assign students to courses
  - Set due dates
  - Bulk assignment
- Progress monitoring
  - View all students' progress
  - See individual step completion
  - Identify struggling students
  - Track completion rates
- Analytics dashboard
  - Course-level analytics
  - Student performance metrics
  - MCQ analytics
  - Batch summary reports
  - Individual student deep-dive
  - Export to CSV
- Test creation
  - Create assessments
  - Add MCQs to tests
  - Set passing criteria
  - Schedule tests
  - View test results

**Key Screens:**
- Faculty dashboard with course list
- Course creation wizard
- Learning flow builder
- Student assignment interface
- Progress tracking table
- Analytics dashboard with charts
- Test creation & management

---

### 5. Student Portal
**URL:** http://localhost:3000/student  
**Role:** STUDENT

**Features:**
- Dashboard with assigned courses
- Course view with learning flow
  - See all steps in sequence
  - Visual progress indicator
  - Locked vs unlocked steps (prerequisites)
- Content access
  - PDF viewer for books
  - Video player with controls
  - Notes viewer
  - Download controls (if allowed)
- Step completion
  - Mark steps as complete
  - Auto-unlock next step
  - Progress persistence
- Test taking
  - Take assigned tests
  - MCQ interface
  - Timer (if enabled)
  - Submit answers
  - View results
- Progress tracking
  - Overall course progress
  - Competency achievement
  - Time spent
  - Performance analytics
- Notifications
  - New assignments
  - Due dates
  - Grade updates

**Key Screens:**
- Student dashboard with course cards
- Course detail with learning flow
- Content viewer (PDF/Video)
- Test-taking interface
- Progress & analytics page
- Profile settings

---

## API DOCUMENTATION

### Complete API Endpoints (50+)

#### Authentication Module
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - User login
POST   /api/auth/refresh           - Refresh access token
GET    /api/auth/profile           - Get current user profile
POST   /api/auth/change-password   - Change password
POST   /api/auth/logout            - Logout user
```

#### Bitflow Owner Module
```
POST   /api/bitflow-owner/publishers              - Create publisher
GET    /api/bitflow-owner/publishers              - List publishers
GET    /api/bitflow-owner/publishers/:id          - Get publisher details
PATCH  /api/bitflow-owner/publishers/:id/status   - Update publisher status
POST   /api/bitflow-owner/publishers/:id/resend-credentials - Resend credentials

POST   /api/bitflow-owner/colleges                - Create college
GET    /api/bitflow-owner/colleges                - List colleges
GET    /api/bitflow-owner/colleges/:id            - Get college details
PATCH  /api/bitflow-owner/colleges/:id/status     - Update college status
```

#### Governance Module (College Admin)
```
GET    /api/college/profile                       - Get college profile
PUT    /api/college/profile                       - Update college profile

POST   /api/governance/departments                - Create department
GET    /api/governance/departments                - List departments
GET    /api/governance/departments/my-departments - Get user's departments
GET    /api/governance/departments/:id            - Get department details
PUT    /api/governance/departments/:id            - Update department
PUT    /api/governance/departments/:id/assign-hod - Assign HOD
DELETE /api/governance/departments/:id/remove-hod - Remove HOD
DELETE /api/governance/departments/:id            - Delete department

POST   /api/governance/faculty-permissions                - Create permission template
POST   /api/governance/faculty-permissions/initialize-defaults - Initialize defaults
GET    /api/governance/faculty-permissions                - List permissions
GET    /api/governance/faculty-permissions/:id            - Get permission details
PUT    /api/governance/faculty-permissions/:id            - Update permission
DELETE /api/governance/faculty-permissions/:id            - Delete permission

POST   /api/governance/faculty-assignments        - Assign faculty
GET    /api/governance/faculty-assignments        - List assignments
PUT    /api/governance/faculty-assignments/:id    - Update assignment
DELETE /api/governance/faculty-assignments/:id    - Remove assignment

GET    /api/governance/faculty-users              - List faculty users
POST   /api/governance/faculty-users              - Create faculty user
GET    /api/governance/faculty-users/:id          - Get faculty details
PUT    /api/governance/faculty-users/:id          - Update faculty
DELETE /api/governance/faculty-users/:id          - Delete faculty

GET    /api/governance/course-analytics/overview          - Course overview **NEW**
GET    /api/governance/course-analytics/course-comparison - Compare courses **NEW**
GET    /api/governance/course-analytics/course-details    - Course details **NEW**

GET    /api/governance/notifications              - List notifications
POST   /api/governance/notifications              - Create notification
DELETE /api/governance/notifications/:id          - Delete notification
```

#### Student Module
```
POST   /api/students                   - Create student
POST   /api/students/bulk-upload       - Bulk upload via CSV
GET    /api/students                   - List students
GET    /api/students/stats             - Get student statistics
GET    /api/students/:id               - Get student details
PATCH  /api/students/:id               - Update student
PATCH  /api/students/:id/activate      - Activate student
PATCH  /api/students/:id/deactivate    - Deactivate student
POST   /api/students/bulk-promote      - Bulk promote students
POST   /api/students/:id/reset-credentials - Reset student password
DELETE /api/students/:id               - Delete student
```

#### Course Module
```
POST   /api/courses              - Create course
GET    /api/courses              - List courses
GET    /api/courses/:id          - Get course details
PUT    /api/courses/:id          - Update course
DELETE /api/courses/:id          - Delete course
POST   /api/courses/:id/publish  - Publish course
POST   /api/courses/assign       - Assign course to students
GET    /api/courses/:id/analytics - Get course analytics
```

#### Faculty Analytics
```
GET    /api/faculty/dashboard                           - Faculty dashboard
GET    /api/faculty/courses/:courseId/analytics         - Course analytics
GET    /api/faculty/courses/:courseId/batch-summary     - Batch summary
GET    /api/faculty/courses/:courseId/mcq-analytics     - MCQ analytics
GET    /api/faculty/courses/:courseId/students/:studentId - Individual student
GET    /api/faculty/courses/:courseId/report            - Generate report
GET    /api/faculty/courses/:courseId/report/csv        - Export CSV
```

#### Student Portal
```
GET    /api/student-portal/dashboard                    - Student dashboard
GET    /api/student-portal/courses/:id                  - Course details
GET    /api/student-portal/courses/:id/progress         - Course progress
POST   /api/student-portal/steps/:stepId/complete       - Mark step complete
GET    /api/student-portal/learning-unit/:id/access     - Get content access token
```

#### Publisher Admin Module
```
GET    /api/publisher/profile       - Get publisher profile
PUT    /api/publisher/profile       - Update publisher profile
POST   /api/publisher/profile/change-password - Change password

POST   /api/publisher-admin/mcqs           - Create MCQ
GET    /api/publisher-admin/mcqs           - List MCQs
GET    /api/publisher-admin/mcqs/stats     - MCQ statistics
GET    /api/publisher-admin/mcqs/:id       - Get MCQ details
PUT    /api/publisher-admin/mcqs/:id       - Update MCQ
DELETE /api/publisher-admin/mcqs/:id       - Delete MCQ
POST   /api/publisher-admin/mcqs/:id/verify - Verify MCQ
POST   /api/publisher-admin/mcqs/bulk-upload - Bulk upload MCQs
POST   /api/publisher-admin/mcqs/upload-image - Upload question image

POST   /api/learning-units           - Create learning unit
GET    /api/learning-units           - List learning units
GET    /api/learning-units/:id       - Get learning unit details
PUT    /api/learning-units/:id       - Update learning unit
DELETE /api/learning-units/:id       - Delete learning unit
POST   /api/learning-units/:id/publish - Publish learning unit
POST   /api/learning-units/upload    - Upload content file
```

#### Competency Module
```
POST   /api/competencies              - Create competency
GET    /api/competencies              - List competencies
GET    /api/competencies/subjects     - List subjects
GET    /api/competencies/stats        - Competency statistics
GET    /api/competencies/:id          - Get competency details
PATCH  /api/competencies/:id          - Update competency
PATCH  /api/competencies/:id/activate - Activate competency
PATCH  /api/competencies/:id/deprecate - Deprecate competency
```

#### Topics Module
```
GET    /api/topics                    - List topics
GET    /api/topics/search             - Search topics
GET    /api/topics/subjects           - List subjects
GET    /api/topics/by-subject/:subject - Get topics by subject
GET    /api/topics/:id                - Get topic details
GET    /api/topics/:id/competencies   - Get topic competencies
POST   /api/topics                    - Create topic
POST   /api/topics/bulk-import        - Bulk import topics
PUT    /api/topics/:id                - Update topic
DELETE /api/topics/:id                - Delete topic
```

#### Packages Module
```
POST   /api/packages                         - Create package
GET    /api/packages                         - List packages
GET    /api/packages/:id                     - Get package details
PUT    /api/packages/:id                     - Update package
DELETE /api/packages/:id                     - Delete package

POST   /api/packages/assignments             - Assign package to college
GET    /api/packages/assignments/all         - List all assignments
GET    /api/packages/assignments/college/:id - Get college assignments
PUT    /api/packages/assignments/:id         - Update assignment
DELETE /api/packages/assignments/:id         - Remove assignment
```

### API Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <access_token>
```

### Sample API Calls

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@aiims.edu",
    "password": "Password123!"
  }'
```

**Get College Profile:**
```bash
curl http://localhost:3001/api/college/profile \
  -H "Authorization: Bearer <token>"
```

**Create Student:**
```bash
curl -X POST http://localhost:3001/api/students \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@aiims.edu",
    "currentAcademicYear": "YEAR_1",
    "departmentId": "<dept-id>"
  }'
```

---

## DATA TRANSPARENCY & RELATIONSHIPS

### Why Data is Transparent

The system ensures complete data transparency through:

1. **Relational Integrity**
   - All foreign keys properly defined
   - Cascade deletes configured
   - Referential integrity enforced

2. **Multi-tenant Isolation**
   - Every entity linked to collegeId or publisherId
   - Automatic filtering by tenant
   - No cross-tenant data leakage

3. **Hierarchical Structure**
   - Clear parent-child relationships
   - Students → Departments → Colleges
   - Courses → Faculty → Colleges
   - Learning Units → Publishers

4. **Progress Tracking**
   - Direct linkage: Student → Course → Steps
   - Real-time progress updates
   - Aggregated statistics

### Current Data Relationships

```
AIIMS Nagpur (College)
├── 8 Departments
│   ├── Department of Anatomy
│   │   └── Students (Year 1-3)
│   ├── Department of Physiology
│   │   └── Students (Year 1-3)
│   └── ... (6 more)
├── 4 Faculty Members
│   ├── faculty1@aiimsnagpur.edu.in
│   │   └── Created Courses:
│   │       └── Pre-Clinical Anatomy Module
│   │           └── 3 Learning Flow Steps
│   │               ├── Gray's Anatomy - Upper Limb (Elsevier)
│   │               ├── Clinical Anatomy Quick Notes (Elsevier)
│   │               └── Heart Dissection Video (Elsevier)
│   └── ... (3 more faculty)
└── 15 Students
    ├── aiim001@aiimsnagpur.edu.in (Year 1)
    │   └── Assigned Courses: [Pre-Clinical Anatomy Module]
    │       └── Progress: 33% (1/3 steps completed)
    └── ... (14 more students)

Elsevier Medical (Publisher)
├── 15 Learning Units
│   ├── 5 Books (Anatomy, Physiology, Biochemistry, Pathology, Pharmacology)
│   ├── 5 Videos (same subjects)
│   └── 5 Notes (same subjects)
└── 20 MCQs
    ├── Anatomy MCQs (4)
    ├── Physiology MCQs (4)
    ├── Biochemistry MCQs (4)
    ├── Pathology MCQs (4)
    └── Pharmacology MCQs (4)
```

### Sample Data Flow

**Student Journey:**
1. Student `aiim001@aiimsnagpur.edu.in` logs in
2. System finds user in `users` table with `collegeId = col-aiims-001`
3. Dashboard shows courses from `course_assignments` where `studentId = student-id`
4. Student clicks on "Pre-Clinical Anatomy Module"
5. System loads `learning_flow_steps` for this course (3 steps)
6. Step 1 status from `step_progress` shows COMPLETED
7. Step 2 shows IN_PROGRESS (prerequisite met)
8. Step 3 shows LOCKED (prerequisite not met)
9. Student clicks Step 2 (Gray's Anatomy Book)
10. System creates access token in `learning_unit_access_logs`
11. Content displayed with watermark showing student info
12. Student completes step → `step_progress` updated to COMPLETED
13. Step 3 automatically unlocks
14. Course `student_progress` updated: 66% → 100%

**Faculty Analytics:**
1. Faculty logs in to view "Pre-Clinical Anatomy Module"
2. System queries `course_assignments` for all enrolled students
3. For each student, fetches `step_progress` records
4. Aggregates: 
   - 15 students enrolled
   - 10 completed (66%)
   - 3 in progress (20%)
   - 2 not started (13%)
5. Charts display completion rates per step
6. Identifies struggling students (<50% progress)

**College Admin Course Comparison:**
1. Admin accesses Course Analytics tab
2. System queries all courses in `col-aiims-001`
3. For each course:
   - Count enrolled students from `course_assignments`
   - Calculate avg completion from `student_progress`
   - Get completion rate, in-progress count
4. Display comparison chart showing:
   - Course titles
   - Enrollment numbers
   - Completion percentages
   - Performance metrics

---

## SETUP & INSTALLATION

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ running
- npm package manager
- Git (optional)

### Step 1: Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker-compose up -d

# Or manually create database
psql -U postgres
CREATE DATABASE bitflow_lms;
\q
```

### Step 2: Backend Setup

```bash
cd /path/to/MEDICAL_LMS/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/bitflow_lms"
# JWT_SECRET="your-secret-key"

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database with sample data
node seed-all.cjs

# Start backend server
npm run start:dev
```

Backend will run on: http://localhost:3001

### Step 3: Frontend Setup

```bash
cd /path/to/MEDICAL_LMS/frontend

# Install dependencies
npm install

# Start frontend server
npm start
```

Frontend will run on: http://localhost:3000

### Step 4: Verification

1. Open browser: http://localhost:3000/login
2. Login with: `admin@aiims.edu` / `Password123!`
3. You should see the College Admin Dashboard

### Environment Variables

**Backend `.env`:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bitflow_lms"
JWT_SECRET="super-secret-jwt-key-change-in-production"
JWT_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="30d"
PORT=3001
```

**Frontend `.env` (if needed):**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

## TESTING GUIDE

### Manual Testing Checklist

#### 1. Authentication Testing
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Logout and verify token cleared
- [ ] Access protected route without login (should redirect)
- [ ] Token refresh on expiry
- [ ] Password change functionality

#### 2. Bitflow Owner Testing
- [ ] View dashboard statistics
- [ ] Create new publisher
- [ ] Edit publisher details
- [ ] Create new college
- [ ] Edit college details
- [ ] View audit logs

#### 3. Publisher Admin Testing
- [ ] View publisher profile
- [ ] Create learning unit (Book)
- [ ] Create learning unit (Video)
- [ ] Create MCQ manually
- [ ] Bulk upload MCQs via CSV
- [ ] Create package
- [ ] View content statistics

#### 4. College Admin Testing
- [ ] View dashboard statistics
- [ ] Click stat cards (Top Performers, Need Attention)
- [ ] View student list modal
- [ ] Create department
- [ ] Create faculty user
- [ ] Create student (individual)
- [ ] Bulk upload students via CSV
- [ ] View Course Analytics tab
- [ ] Compare courses
- [ ] Filter by academic year

#### 5. Faculty Testing
- [ ] View faculty dashboard
- [ ] Create new course
- [ ] Add learning flow steps
- [ ] Assign course to students
- [ ] View student progress
- [ ] Access course analytics
- [ ] View batch summary
- [ ] Export CSV report
- [ ] View individual student details

#### 6. Student Testing
- [ ] View student dashboard
- [ ] See assigned courses
- [ ] Open course (view learning flow)
- [ ] Access unlocked learning unit
- [ ] Complete a step
- [ ] Verify next step unlocked
- [ ] Check progress percentage updated
- [ ] View personal analytics

### API Testing with cURL

**Test Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiims.edu","password":"Password123!"}' \
  | jq
```

**Test Get Students (requires auth):**
```bash
TOKEN="<your-access-token>"
curl http://localhost:3001/api/students \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

**Test Course Analytics:**
```bash
curl http://localhost:3001/api/governance/course-analytics/overview \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

### Sample CSV Files

**Student Bulk Upload Template:**
```csv
fullName,email,currentAcademicYear,departmentCode
Rahul Sharma,rahul001@aiims.edu,YEAR_1,ANAT
Priya Patel,priya002@aiims.edu,YEAR_1,PHYS
Amit Kumar,amit003@aiims.edu,YEAR_2,BIOC
```

**MCQ Bulk Upload Template:**
```csv
question,optionA,optionB,optionC,optionD,correctAnswer,explanation,subject,topic,difficultyLevel
"What is the powerhouse of the cell?",Nucleus,Mitochondria,Ribosome,Golgi,B,"Mitochondria produce ATP",Biochemistry,Cell Biology,K
```

---

## LOGIN CREDENTIALS

### All Users - Universal Password

```
Password: Password123!
```

### Bitflow Owner
```
Email: owner@bitflow.com
Role: BITFLOW_OWNER
Access: Full platform access
```

### Publisher Admins
```
Elsevier:  admin@elsevier.com
Springer:  admin@springer.com
Wiley:     admin@wiley.com
Role: PUBLISHER_ADMIN
Access: Content management for their publisher
```

### College Admins
```
AIIMS Nagpur: admin@aiimsnagpur.edu.in
AIIMS Delhi:  admin@aiims.edu
KMC Manipal:  admin@manipal.edu
Role: COLLEGE_ADMIN
Access: Full college management
```

### Faculty Users

**AIIMS Nagpur:**
```
faculty1@aiimsnagpur.edu.in
faculty2@aiimsnagpur.edu.in
faculty3@aiimsnagpur.edu.in
faculty4@aiimsnagpur.edu.in
```

**AIIMS Delhi:**
```
faculty1@aiims.edu
faculty2@aiims.edu
faculty3@aiims.edu
faculty4@aiims.edu
```

**KMC Manipal:**
```
faculty1@manipal.edu
faculty2@manipal.edu
faculty3@manipal.edu
faculty4@manipal.edu
```

### Student Users

**AIIMS Nagpur (15 students):**
```
aiim001@aiimsnagpur.edu.in through aiim015@aiimsnagpur.edu.in
```

**AIIMS Delhi (15 students):**
```
aiim001@aiims.edu through aiim015@aiims.edu
```

**KMC Manipal (15 students):**
```
aiim001@manipal.edu through aiim015@manipal.edu
```

### Quick Test Accounts

| Role | Email | Purpose |
|------|-------|---------|
| **Owner** | owner@bitflow.com | Test platform management |
| **Publisher** | admin@elsevier.com | Test content creation |
| **Admin** | admin@aiims.edu | Test college management |
| **Faculty** | faculty1@aiims.edu | Test course creation |
| **Student** | aiim001@aiims.edu | Test learning experience |

---

## KNOWN ISSUES & LIMITATIONS

### Current Limitations

1. **File Storage**
   - Files stored locally in `backend/uploads/`
   - No cloud storage integration (AWS S3, Azure Blob)
   - Large files may impact server storage

2. **Email Notifications**
   - Email service not configured
   - Password reset emails not sent
   - Notification system UI only

3. **Payment Integration**
   - Package pricing not implemented
   - No payment gateway integration
   - Subscription management pending

4. **Advanced Analytics**
   - Predictive analytics not implemented
   - ML-based recommendations pending
   - Advanced reporting limited

5. **Mobile App**
   - No dedicated mobile application
   - Responsive web UI only
   - Native app features unavailable

6. **Real-time Features**
   - No WebSocket implementation
   - Live notifications pending
   - Real-time collaboration limited

7. **Performance**
   - Large dataset queries not optimized
   - Pagination implemented but can be improved
   - Caching layer not implemented

8. **Security**
   - Rate limiting basic
   - DDoS protection minimal
   - Advanced security features pending

### Known Bugs

1. **TypeScript Warnings**
   - `backend/prisma/seed.ts` has compilation errors
   - File is unused (using `seed-all.cjs`)
   - No impact on runtime

2. **Frontend State Management**
   - Some components re-render unnecessarily
   - Global state management could be optimized
   - Consider Redux/Context API improvements

3. **Error Handling**
   - Some API errors not user-friendly
   - Better error messages needed
   - Loading states could be improved

### Workarounds

**For TypeScript Warnings:**
- Ignore warnings from `seed.ts`
- Use `seed-all.cjs` for database seeding
- No action required

**For File Upload:**
- Keep uploaded files small (<10MB)
- Monitor `backend/uploads/` directory size
- Clean old files periodically

**For Performance:**
- Use pagination on large lists
- Limit query results
- Add indexes on frequently queried fields

---

## FUTURE ENHANCEMENTS

### Phase 6: Advanced Features (Planned)

1. **Email Integration**
   - Welcome emails
   - Password reset emails
   - Assignment notifications
   - Grade notifications

2. **Cloud Storage**
   - AWS S3 integration
   - Azure Blob Storage
   - CDN for video streaming
   - Image optimization

3. **Advanced Analytics**
   - Predictive analytics
   - Student risk assessment
   - Course recommendation engine
   - Competency gap analysis

4. **Mobile Application**
   - React Native app
   - Offline content access
   - Push notifications
   - Mobile-specific features

### Phase 7: Enterprise Features (Planned)

1. **Payment & Billing**
   - Razorpay/Stripe integration
   - Subscription management
   - Invoice generation
   - Revenue analytics

2. **Advanced Security**
   - Two-factor authentication
   - SSO integration (Google, Microsoft)
   - Advanced DRM
   - Penetration testing

3. **Performance Optimization**
   - Redis caching
   - Database query optimization
   - CDN integration
   - Load balancing

4. **Compliance & Reporting**
   - GDPR compliance
   - Data export tools
   - Audit report generation
   - Accreditation reports

### Phase 8: AI & ML Features (Planned)

1. **AI-Powered Features**
   - Smart content recommendations
   - Automated competency mapping
   - Intelligent tutoring system
   - Chatbot support

2. **Advanced Testing**
   - Adaptive testing
   - Question bank AI
   - Automated grading
   - Plagiarism detection

3. **Learning Analytics**
   - Learning path optimization
   - Peer comparison
   - Engagement metrics
   - Success prediction

---

## CONCLUSION

### Project Status Summary

✅ **FULLY OPERATIONAL**

The Bitflow Medical LMS is a complete, working learning management system with:
- 7 distinct user roles with appropriate access controls
- 30+ database models with proper relationships
- 50+ RESTful API endpoints
- 12+ responsive frontend pages
- Complete authentication & authorization
- Real-time progress tracking
- Comprehensive analytics
- Multi-tenant architecture
- Fully seeded database with realistic data

### Data Transparency Achieved

✅ **100% TRANSPARENT**

All data in the system is:
- Properly related through foreign keys
- Accessible through appropriate portals
- Filtered by tenant (college/publisher)
- Traceable through audit logs
- Consistent across all views

**Example:**
- A student created in College Admin portal
- Appears in Faculty portal when assigned to course
- Shows in Student portal with course access
- Tracked in Analytics with progress data
- Logged in Audit system for compliance

### Ready for Production

The system is ready for:
- ✅ Development/Testing environments
- ✅ Staging deployment
- ⚠️ Production (with security hardening)

**Production Checklist:**
- [ ] Change all default passwords
- [ ] Configure production database
- [ ] Set up cloud file storage
- [ ] Implement email service
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring (logging, errors)
- [ ] Configure backups
- [ ] Perform security audit
- [ ] Load testing
- [ ] Documentation review

### Support & Maintenance

For issues, questions, or enhancements:
1. Check this guide first
2. Review error logs (`backend/logs/`)
3. Test with sample credentials
4. Verify database connections
5. Check browser console for frontend errors

### Final Notes

This Medical LMS represents a solid foundation for medical education management. The system architecture supports scalability, the database design ensures data integrity, and the multi-tenant approach allows serving multiple institutions simultaneously.

The recent enhancements (Course Analytics, Clickable Cards, Progress Visualization) demonstrate the system's extensibility and readiness for additional features.

**All components are working together transparently, providing a seamless experience across all user roles.**

---

**Document Version:** 1.0  
**Last Updated:** February 4, 2026  
**Maintained By:** Development Team  

**END OF GUIDE**
