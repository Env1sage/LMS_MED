# 🏥 Bitflow Medical LMS - Complete Project Structure

**Last Updated:** February 5, 2026  
**Project Status:** ✅ Production Ready  
**Tech Stack:** NestJS (Backend) + React (Frontend) + PostgreSQL + Prisma ORM

---

## 📊 Project Statistics

- **Total Frontend Pages:** 35
- **Backend API Controllers:** 23
- **Frontend Services:** 16
- **Backend Modules:** 14+
- **Database Tables:** 30+
- **Total Lines of Code:** ~50,000+

---

## 📁 Root Directory Structure

```
MEDICAL_LMS/
├── backend/                    # NestJS Backend API
├── frontend/                   # React Frontend Application
├── documentation/              # Project Documentation
├── Updated_Documentation/      # Updated Phase Documentation
├── prisma_BACKUP/             # Database Schema Backups
├── docker-compose.yml         # Docker Configuration
├── LOGIN_CREDENTIALS.md       # Login Credentials
└── README.md                  # Project Overview
```

---

## 🔧 Backend Structure

### Directory Layout

```
backend/
├── prisma/                    # Database Schema & Migrations
│   ├── migrations/           # Database Migration Files
│   ├── schema.prisma        # Prisma Schema Definition
│   ├── seed.ts.bak          # Database Seed Scripts
│   ├── reset-passwords.ts   # Password Reset Script
│   └── reset-progress.ts    # Progress Reset Script
│
├── src/                      # Source Code
│   ├── audit/               # Audit Logging Module
│   ├── auth/                # Authentication & Authorization
│   ├── bitflow-owner/       # Bitflow Owner (Super Admin)
│   ├── common/              # Shared Resources
│   ├── competency/          # MCI Competency Framework
│   ├── course/              # Course Management
│   ├── email/               # Email Services
│   ├── governance/          # College Governance
│   ├── learning-unit/       # Learning Content Management
│   ├── packages/            # Publisher Package Management
│   ├── prisma/              # Prisma Service
│   ├── progress/            # Student Progress Tracking
│   ├── publisher-admin/     # Publisher Administration
│   ├── ratings/             # Rating & Review System
│   ├── student/             # Student Management
│   ├── student-portal/      # Student Portal APIs
│   ├── topics/              # Topic Management
│   ├── app.module.ts        # Main Application Module
│   └── main.ts              # Application Entry Point
│
├── scripts/                  # Utility Scripts
│   ├── cleanup-data.ts      # Data Cleanup
│   ├── migrate-mci-competencies.ts
│   └── generate-excel-template.js
│
├── uploads/                  # File Upload Storage
│   ├── books/               # Book PDFs
│   ├── videos/              # Video Files
│   ├── notes/               # Study Notes
│   ├── images/              # Images
│   ├── self-paced/          # Self-paced Content
│   └── mcq-csvs/           # MCQ CSV Files
│
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript Config
└── nest-cli.json            # NestJS CLI Config
```

### Backend API Controllers (23)

| Controller | Module | Endpoints | Purpose |
|------------|--------|-----------|---------|
| **AuthController** | auth | `/api/auth/*` | Login, logout, refresh tokens |
| **BitflowOwnerController** | bitflow-owner | `/api/bitflow-owner/*` | System-wide management |
| **CollegeProfileController** | governance | `/api/college/profile` | College profile management |
| **CompetencyController** | competency | `/api/competencies/*` | MCI competency framework |
| **CourseController** | course | `/api/courses/*` | Course CRUD operations |
| **CourseAnalyticsController** | governance | `/api/governance/course-analytics/*` | Course analytics |
| **DepartmentController** | governance | `/api/governance/departments/*` | Department management |
| **FacultyAnalyticsController** | course | `/api/faculty/*` | Faculty dashboard & analytics |
| **FacultyAssignmentController** | governance | `/api/governance/faculty-assignments/*` | Faculty assignments |
| **FacultyPermissionController** | governance | `/api/governance/faculty-permissions/*` | Faculty permissions |
| **FacultyUserController** | governance | `/api/governance/faculty-users/*` | Faculty user management |
| **LearningUnitController** | learning-unit | `/api/learning-units/*` | Learning content management |
| **McqController** | publisher-admin | `/api/publisher-admin/mcqs/*` | MCQ management |
| **PackagesController** | packages | `/api/packages/*` | Package management |
| **ProgressController** | progress | `/api/progress/*` | Progress tracking |
| **PublisherProfileController** | publisher-admin | `/api/publisher/profile` | Publisher profile |
| **RatingsController** | ratings | `/api/ratings/*` | Rating system |
| **SelfPacedController** | course | `/api/self-paced/*` | Self-paced learning |
| **StudentController** | student | `/api/students/*` | Student management |
| **StudentPortalController** | student-portal | `/api/student-portal/*` | Student portal APIs |
| **TopicsController** | topics | `/api/topics/*` | Topic management |
| **AppController** | app | `/api` | Health check |

---

## 🎨 Frontend Structure

### Directory Layout

```
frontend/
├── public/                   # Static Assets
│   ├── index.html           # HTML Template
│   ├── favicon.ico          # Favicon
│   ├── logo192.png          # App Logo
│   └── manifest.json        # PWA Manifest
│
├── src/                      # Source Code
│   ├── components/          # Reusable Components
│   │   ├── common/         # Common Components
│   │   │   ├── BackButton.tsx
│   │   │   ├── CompetencySearch.tsx
│   │   │   └── ProfileModal.tsx
│   │   ├── publisher/      # Publisher Components
│   │   │   ├── BulkLearningUnitUpload.tsx
│   │   │   ├── BulkMcqUpload.tsx
│   │   │   └── FileUploadButton.tsx
│   │   ├── charts/         # Chart Components
│   │   │   ├── BarChart.tsx
│   │   │   ├── LineChart.tsx
│   │   │   └── PieChart.tsx
│   │   ├── PackageManagement.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── RatingDisplay.tsx
│   │   ├── RatingForm.tsx
│   │   ├── StarRating.tsx
│   │   └── TopicSearch.tsx
│   │
│   ├── config/              # Configuration
│   │   └── api.config.ts   # API Configuration
│   │
│   ├── context/             # React Context
│   │   └── AuthContext.tsx # Authentication Context
│   │
│   ├── pages/               # Page Components (35 pages)
│   │   └── (see Pages section below)
│   │
│   ├── services/            # API Services (16)
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── bitflow-owner.service.ts
│   │   ├── competency.service.ts
│   │   ├── course.service.ts
│   │   ├── governance.service.ts
│   │   ├── learning-unit.service.ts
│   │   ├── mcq.service.ts
│   │   ├── packages.service.ts
│   │   ├── publisher.service.ts
│   │   ├── ratings.service.ts
│   │   ├── self-paced.service.ts
│   │   ├── student-portal.service.ts
│   │   ├── student.service.ts
│   │   ├── topics.service.ts
│   │   └── upload.service.ts
│   │
│   ├── styles/              # CSS Stylesheets
│   │   ├── CollegeAdminDashboard.css
│   │   ├── CreateCourse.css
│   │   ├── FacultyPortal.css
│   │   ├── Login.css
│   │   ├── PublisherDashboard.css
│   │   ├── StudentDashboard.css
│   │   ├── StudentPortal.css
│   │   └── ...more styles
│   │
│   ├── types/               # TypeScript Types
│   │   └── (type definitions)
│   │
│   ├── App.tsx              # Main App Component
│   ├── App.css              # App Styles
│   ├── index.tsx            # Entry Point
│   └── index.css            # Global Styles
│
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript Config
```

---

## 📄 Frontend Pages (35 Total)

### 🔐 Authentication
- **Login.tsx** - User login page with role-based routing
- **UnauthorizedPage.tsx** - 403 Unauthorized access page

### 👨‍💼 Bitflow Owner (Super Admin)
- **BitflowOwnerDashboard.tsx** - System-wide analytics and management

### 🏛️ College Administration
- **CollegeAdminDashboard.tsx** - College admin main dashboard
- **CollegeAdminDashboardNew.tsx** - Enhanced admin dashboard
- **CollegeProfile.tsx** - College profile management
- **DeanDashboard.tsx** - Dean's administrative dashboard

### 👥 Student Management
- **StudentDashboard.tsx** - Student list and management
- **CreateStudent.tsx** - Student registration form
- **EditStudent.tsx** - Edit student details
- **ResetStudentPassword.tsx** - Password reset for students
- **StudentTracking.tsx** - Student progress tracking
- **StudentProgressDetail.tsx** - Detailed progress view

### 👨‍🏫 Faculty Management
- **FacultyDashboard.tsx** - Faculty main dashboard
- **FacultyManagement.tsx** - Faculty list and management
- **FacultyManagementNew.tsx** - Enhanced faculty management

### 🏢 Department Management
- **DepartmentManagement.tsx** - Department CRUD operations
- **DepartmentManagementNew.tsx** - Enhanced department management

### 📚 Course Management
- **CreateCourse.tsx** - Create new course with learning flow
- **EditCourse.tsx** - Edit existing course
- **CourseDetails.tsx** - View course details
- **CourseAnalytics.tsx** - Course performance analytics
- **AssignCourse.tsx** - Assign courses to students

### 📖 Learning Content
- **ContentManagement.tsx** - Manage learning units
- **CreateLearningUnit.tsx** - Create new learning content
- **ViewLearningUnit.tsx** - View learning unit details
- **SelfPacedContentManager.tsx** - Faculty self-paced content management
- **StudentSelfPaced.tsx** - Student self-paced learning

### 🎓 Competency Framework
- **CompetencyDashboard.tsx** - MCI competency management

### 📝 Assessment
- **McqManagement.tsx** - MCQ creation and management
- **TestAttempt.tsx** - Student test interface

### 📊 Publisher Portal
- **PublisherAdminDashboard.tsx** - Publisher dashboard
- **PublisherProfilePage.tsx** - Publisher profile settings

### 🧑‍🎓 Student Portal
- **StudentPortal.tsx** - Main student dashboard with:
  - Course overview
  - Progress tracking
  - Academic calendar
  - Announcements & notifications
  - Upcoming tests
  - Practice sessions
- **StudentCourseView.tsx** - Student course viewing interface

---

## 🗄️ Database Schema (30+ Tables)

### Core Tables
- **users** - All system users (students, faculty, admin, owner)
- **colleges** - Medical colleges/institutions
- **publishers** - Content publishers
- **students** - Student-specific data

### Academic Structure
- **departments** - College departments
- **competencies** - MCI competency framework
- **topics** - Subject topics
- **courses** - Faculty-created courses
- **learning_units** - Learning content (video, book, notes, MCQ)
- **learning_flow_steps** - Course learning sequence

### Progress Tracking
- **student_progress** - Overall course progress
- **step_progress** - Individual step completion
- **course_assignments** - Course assignments to students
- **test_assignments** - Test assignments

### Assessment
- **tests** - Test/exam definitions
- **test_questions** - MCQ questions in tests
- **test_attempts** - Student test attempts
- **test_answers** - Student answers
- **mcqs** - MCQ question bank

### Content Management
- **packages** - Publisher content packages
- **college_packages** - Package assignments to colleges
- **self_paced_content** - Faculty-uploaded content
- **self_paced_access** - Student access logs

### Governance
- **faculty_assignments** - Faculty-department assignments
- **faculty_permissions** - Faculty permission levels
- **student_departments** - Student-department relationships

### System
- **audit_logs** - Immutable audit trail
- **refresh_tokens** - JWT refresh tokens
- **notifications** - System notifications
- **notification_reads** - Read status tracking

### Analytics
- **ratings** - Rating and review system
- **learning_unit_access_logs** - Content access tracking

---

## 🔑 User Roles & Access

### 1. BITFLOW_OWNER (Super Admin)
- **Access:** System-wide control
- **Features:**
  - Manage all colleges and publishers
  - System analytics
  - Global settings
  - Security policies
  - Audit log review

### 2. PUBLISHER_ADMIN
- **Access:** Publisher-scoped
- **Features:**
  - Upload learning units (videos, books, notes)
  - Create and manage MCQs
  - Package management
  - Content analytics
  - Publisher profile

### 3. COLLEGE_ADMIN
- **Access:** College-scoped
- **Features:**
  - Student management (CRUD)
  - Batch operations
  - Student promotion
  - Department management
  - College analytics
  - Faculty management

### 4. FACULTY
- **Access:** College-scoped
- **Features:**
  - Create courses
  - Design learning flows
  - Assign courses to students
  - Upload self-paced content
  - Create tests and MCQs
  - View student progress
  - Course analytics

### 5. STUDENT
- **Access:** Personal scope
- **Features:**
  - View assigned courses
  - Access learning content
  - Track progress
  - Take tests
  - Self-paced learning
  - View calendar and announcements
  - Rate content and courses

---

## 🛣️ API Routes Summary

### Authentication (`/api/auth`)
- POST `/login` - User login
- POST `/logout` - User logout
- POST `/refresh` - Refresh access token
- GET `/me` - Get current user

### Students (`/api/students`)
- GET `/` - List students
- POST `/` - Create student
- GET `/stats` - Student statistics
- PATCH `/:id` - Update student
- DELETE `/:id` - Delete student
- POST `/bulk-upload` - Bulk upload students
- POST `/bulk-promote` - Batch promote students

### Courses (`/api/courses`)
- GET `/` - List courses
- POST `/` - Create course
- GET `/:id` - Get course details
- PUT `/:id` - Update course
- DELETE `/:id` - Delete course
- POST `/:id/publish` - Publish course
- POST `/assign` - Assign course to students
- GET `/:id/analytics` - Course analytics

### Learning Units (`/api/learning-units`)
- GET `/` - List learning units
- POST `/` - Create learning unit
- POST `/upload` - Upload file
- GET `/:id` - Get unit details
- PATCH `/:id` - Update unit
- DELETE `/:id` - Delete unit
- POST `/bulk-upload` - Bulk upload units
- GET `/analytics` - Content analytics

### Progress (`/api/progress`)
- GET `/my-courses` - Student's courses
- GET `/course/:courseId` - Course progress
- POST `/submit` - Submit step progress
- GET `/check-access/:stepId` - Check step access

### Student Portal (`/api/student-portal`)
- GET `/dashboard` - Student dashboard data
- GET `/tests` - Available tests
- POST `/tests/:testId/start` - Start test
- POST `/attempts/:attemptId/answer` - Submit answer
- POST `/attempts/:attemptId/submit` - Submit test
- GET `/library` - Self-paced library
- GET `/analytics` - Student analytics

### Ratings (`/api/ratings`)
- POST `/` - Submit rating
- GET `/my` - User's ratings
- GET `/entity/:type/:id` - Entity ratings
- GET `/college/:collegeId/courses` - Top courses
- DELETE `/:id` - Delete rating

### Competencies (`/api/competencies`)
- GET `/` - List competencies
- POST `/` - Create competency
- GET `/subjects` - Get subjects
- GET `/stats` - Competency statistics
- PATCH `/:id` - Update competency

### Packages (`/api/packages`)
- GET `/` - List packages
- POST `/` - Create package
- GET `/:id` - Get package
- PUT `/:id` - Update package
- DELETE `/:id` - Delete package
- POST `/assignments` - Assign to college
- GET `/content/college/:collegeId` - College content

---

## 📦 Key Features Implementation

### ✅ Multi-Tenancy
- College-level data isolation
- Role-based access control (RBAC)
- Tenant-aware queries via Prisma middleware

### ✅ Security
- JWT authentication with refresh tokens
- Password hashing (bcrypt, 10 rounds)
- CORS with allowed origins
- Audit logging for all actions
- SQL injection prevention (Prisma ORM)

### ✅ Progress Tracking
- Real-time step completion
- Dynamic progress calculation
- Prerequisite enforcement
- Completion certificates ready

### ✅ Content Management
- Multiple content types (video, book, notes, MCQ)
- Secure file uploads
- DRM-ready infrastructure
- Watermark support
- Session expiry controls

### ✅ Assessment System
- MCQ test creation
- Timed assessments
- Automatic scoring
- Multiple attempts support
- Analytics and reporting

### ✅ Analytics & Reporting
- Student performance tracking
- Course effectiveness metrics
- Content usage analytics
- Batch comparisons
- Export capabilities

### ✅ Rating System
- 5-star ratings
- Written reviews
- Multi-entity support (courses, content, faculty)
- Aggregate ratings

### ✅ Self-Paced Learning
- Faculty-uploaded content
- Student library access
- Progress tracking
- Analytics per resource

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Access URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api

### Default Credentials
See `LOGIN_CREDENTIALS.md` for all user credentials.

**Quick Access:**
- Owner: `owner@bitflow.com` / `BitflowAdmin@2026`
- Faculty: `faculty1@aiimsnagpur.edu.in` / `Password123!`
- Student: `aiim002@aiimsnagpur.edu.in` / `Student@123`

---

## 📊 Technology Stack

### Backend
- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Validation:** class-validator
- **File Upload:** Multer

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** CSS3 (Custom)
- **Build Tool:** Create React App

### DevOps
- **Version Control:** Git
- **Package Manager:** npm
- **Database Migrations:** Prisma Migrate
- **Logging:** Winston (backend), console (frontend)

---

## 📈 Project Phases

### ✅ Phase 0: Foundation
- Multi-tenant architecture
- User authentication
- Role-based access
- Audit logging

### ✅ Phase 1: Publisher Portal
- Publisher management
- Content upload
- Package creation

### ✅ Phase 2: Competency Framework
- MCI competency mapping
- 1,681 competencies loaded
- Competency search

### ✅ Phase 3: Learning Units
- Video, book, notes, MCQ
- 180+ learning units
- Bulk upload support

### ✅ Phase 4: College Admin
- Student management
- Batch operations
- Analytics dashboard

### ✅ Phase 5: Faculty Portal
- Course creation
- Learning flow designer
- Student assignment
- Analytics

### ✅ Phase 6: Student Portal
- Course enrollment
- Progress tracking
- Test taking
- Self-paced learning
- Calendar & announcements

### ✅ Phase 7: Enhancements
- Rating system
- Search improvements
- UI/UX refinements

### ✅ Phase 8: Production Ready
- Bug fixes
- Performance optimization
- Security hardening

---

## 🎯 Current Status

**Version:** 1.0.0 Production Ready  
**Last Updated:** February 5, 2026  
**Build Status:** ✅ Passing  
**Test Coverage:** Manual testing complete  
**Known Issues:** None critical  

### Deployment Checklist
- ✅ All features implemented
- ✅ Database seeded
- ✅ Authentication working
- ✅ API endpoints tested
- ✅ UI/UX complete
- ✅ Security measures in place
- ✅ Audit logging active
- ✅ Error handling implemented
- ✅ TypeScript compilation clean
- ✅ ESLint warnings resolved

---

## 📞 Support & Documentation

For detailed documentation, see:
- `documentation/` - Phase-wise documentation
- `LOGIN_CREDENTIALS.md` - User credentials
- `ARCHITECTURE.md` - System architecture
- `README.md` - Project overview

---

**© 2026 Bitflow Medical LMS. All rights reserved.**
