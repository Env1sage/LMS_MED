# Medical LMS - Complete Frontend Features Documentation

## 📋 Table of Contents
1. [Bitflow Owner Portal](#1-bitflow-owner-portal)
2. [Publisher Admin Portal](#2-publisher-admin-portal)
3. [College Admin Portal](#3-college-admin-portal)
4. [Dean Portal](#4-dean-portal)
5. [Faculty Portal](#5-faculty-portal)
6. [Student Portal](#6-student-portal)
7. [Competency Framework](#7-competency-framework)
8. [Content Management](#8-content-management)
9. [Common Features](#9-common-features)

---

## 1. Bitflow Owner Portal

### Overview
**Role**: BITFLOW_OWNER  
**Access**: Super admin access to entire platform  
**Route**: `/dashboard`

### Features

#### Dashboard Overview
- **Statistics Cards**:
  - Total Publishers (with active count)
  - Total Colleges (with active count)
  - Total Content Items
  - Total Competencies
  - Active Users Count
  - Total Courses

- **Activity Trends**:
  - User logins over time
  - Content uploads over time
  - Course assignments over time
  - Interactive charts with period selection

- **Contract Management**:
  - Expired contracts checker
  - Contract renewal alerts
  - Publisher/College contract status

#### Publishers Management
- **List View**:
  - All publishers with pagination
  - Filter by status (ACTIVE, SUSPENDED, PENDING)
  - Search by name/email
  - Sorting options

- **Publisher Details**:
  - View complete publisher information
  - Edit publisher details
  - Update contract dates
  - Change status (activate/suspend)
  - View published content count
  - View analytics

- **Actions**:
  - Create new publisher
  - Edit publisher
  - Suspend/Activate publisher
  - View publisher analytics
  - Manage contracts

#### Colleges Management
- **List View**:
  - All colleges with pagination
  - Filter by status
  - Search by name/code
  - Sorting options

- **College Details**:
  - View complete college information
  - Edit college details
  - Update contract dates
  - Change status
  - View student count
  - View analytics

- **Actions**:
  - Create new college
  - Edit college
  - Suspend/Activate college
  - View college analytics
  - Manage contracts

#### Analytics Dashboard
- **Platform Analytics**:
  - User growth metrics
  - Content library statistics
  - Course completion rates
  - Student enrollment trends
  - Subject popularity
  - Assessment participation
  - Publisher performance
  - College performance

- **Time Periods**:
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - Custom date range

#### Audit Logs
- **View Logs**:
  - All system activities
  - Filter by college, publisher, action
  - Date range filtering
  - Pagination
  - Export functionality

- **Tracked Actions**:
  - User logins
  - Content changes
  - Status updates
  - Contract modifications
  - System configurations

#### Security & Feature Management
- **Security Policy**:
  - Session timeout configuration
  - Password requirements
  - IP whitelisting
  - 2FA settings

- **Feature Flags**:
  - Enable/Disable features
  - Beta feature access
  - Role-based feature toggles

---

## 2. Publisher Admin Portal

### Overview
**Role**: PUBLISHER_ADMIN  
**Access**: Manage learning content  
**Route**: `/publisher-admin`

### Features

#### Dashboard
- **Statistics Cards**:
  - Total Learning Units
  - Active Units
  - Pending Mapping Units
  - Draft Units
  - Books Count
  - Videos Count
  - MCQs Count
  - Notes Count

- **Content Ratings**:
  - Average rating across all content
  - Total reviews count
  - Top-rated content
  - Performance metrics

#### Learning Units Management
- **List View**:
  - All learning units
  - Filter by type (BOOK, VIDEO, NOTES, MCQ)
  - Filter by status (ACTIVE, DRAFT, PENDING_MAPPING)
  - Search functionality
  - Sort by date, title, subject

- **Create Learning Unit**:
  - Title and description
  - Subject and topic
  - Type selection (BOOK, VIDEO, NOTES, MCQ)
  - Difficulty level (K, KH, SH)
  - Delivery type (EMBED)
  - Content URL (secure)
  - Thumbnail upload
  - Competency mapping
  - Tags and metadata

- **Edit Learning Unit**:
  - Update all fields
  - Change status
  - Re-map competencies
  - Upload new content
  - Version control

- **View Learning Unit**:
  - Full details display
  - Content preview
  - Competency mappings
  - Analytics data
  - Security features (watermarks, disabled controls)

#### MCQ Management
- **Dashboard**:
  - Total MCQs
  - Published count
  - Draft count
  - Average difficulty

- **Create MCQ**:
  - Question text
  - 4 options
  - Correct answer selection
  - Explanation
  - Difficulty level
  - Competency mapping
  - Tags

- **Bulk Upload**:
  - CSV template download
  - Upload multiple MCQs
  - Validation and preview
  - Error handling

- **Actions**:
  - Edit MCQ
  - Publish/Unpublish
  - Delete MCQ
  - View analytics

#### Profile Settings
- **Publisher Profile**:
  - Company information
  - Contact details
  - Logo upload
  - Description

---

## 3. College Admin Portal

### Overview
**Role**: COLLEGE_ADMIN  
**Access**: Manage college and students  
**Route**: `/college-admin`

### Features

#### Dashboard
- **Statistics Cards**:
  - Total Students
  - Active Students
  - Graduated Students
  - Current Academic Year Distribution
  - Faculty Count

- **Quick Actions**:
  - Upload students (bulk)
  - Create individual student
  - View analytics
  - Manage faculty

#### Student Management
- **List View**:
  - All college students
  - Filter by academic year (1st, 2nd, 3rd, 4th, Final)
  - Filter by status (ACTIVE, GRADUATED, SUSPENDED)
  - Search by name/email
  - Pagination

- **Create Student**:
  - Personal information
  - Admission year
  - Expected passing year
  - Academic year
  - Email (auto-generated)
  - Password (auto-generated)

- **Bulk Upload**:
  - CSV template download
  - Upload multiple students
  - Validation
  - Auto-generate credentials
  - Email notifications

- **Student Actions**:
  - View details
  - Edit information
  - Reset password
  - Change status
  - View progress
  - View course assignments

#### Faculty Management
- **List View**:
  - All faculty members
  - Department filter
  - Status filter

- **Actions**:
  - Create faculty
  - Edit faculty
  - Assign courses
  - View teaching load

#### Analytics
- **Student Analytics**:
  - Enrollment trends
  - Completion rates
  - Performance metrics
  - Course engagement

---

## 4. Dean Portal

### Overview
**Role**: DEAN  
**Access**: Department-level oversight  
**Route**: `/dean`

### Features

#### Dashboard
- **Department Statistics**:
  - Faculty count
  - Student count
  - Course count
  - Completion rates

- **Department Performance**:
  - Average progress
  - Course-wise analytics
  - Faculty performance
  - Student performance

#### Faculty Oversight
- **View Faculty**:
  - All department faculty
  - Teaching assignments
  - Performance metrics

#### Course Oversight
- **View Courses**:
  - All department courses
  - Enrollment statistics
  - Completion rates
  - Student feedback

#### Analytics
- **Department Analytics**:
  - Trend analysis
  - Comparative metrics
  - Performance reports

---

## 5. Faculty Portal

### Overview
**Role**: FACULTY  
**Access**: Create and manage courses  
**Route**: `/faculty`

### Features

#### Dashboard
- **Statistics Cards**:
  - Total Courses Created
  - Published Courses
  - Draft Courses
  - Total Assignments
  - Active Students
  - Average Completion Rate

- **Recent Courses**:
  - Quick access to recent courses
  - Status indicators
  - Student count

#### Course Management
- **List View**:
  - All faculty courses
  - Filter by status (DRAFT, PUBLISHED, ARCHIVED)
  - Filter by academic year
  - Search functionality
  - Pagination

- **Create Course**:
  - Title and code
  - Description
  - Academic year/semester
  - Subject
  - Learning flow design:
    - Add steps sequentially
    - Select learning units
    - Set step order
    - Preview flow

- **Edit Course**:
  - Update details
  - Modify learning flow
  - Add/Remove steps
  - Reorder steps
  - Change status

- **Publish Course**:
  - Review before publish
  - Publish confirmation
  - Notify students

- **Delete Course**:
  - Soft delete
  - Confirmation required
  - Archive option

#### Student Assignment
- **Assign Course**:
  - Select students (multi-select)
  - Filter by academic year
  - Bulk assignment
  - Email notifications

- **View Assignments**:
  - List all assigned students
  - Progress tracking
  - Completion status

#### Course Analytics
- **Overview**:
  - Enrollment count
  - Completion rate
  - Average progress
  - Time spent

- **Student Performance**:
  - Individual progress
  - Completion status
  - Time taken per step
  - Engagement metrics

- **Step Analytics**:
  - Step-wise completion
  - Average time per step
  - Difficult steps identification

#### Student Tracking
- **Progress Monitor**:
  - Real-time progress
  - Step completion
  - Current position
  - Last activity

---

## 6. Student Portal

### Overview
**Role**: STUDENT  
**Access**: Access assigned courses  
**Route**: `/student`

### Features

#### Dashboard
- **My Courses**:
  - All assigned courses
  - Progress cards
  - Status badges (Not Started, In Progress, Completed)
  - Completion percentage
  - Next step indicator

- **Statistics**:
  - Total enrolled courses
  - Courses in progress
  - Completed courses
  - Overall progress

#### Course View
- **Learning Path**:
  - Vertical stepper
  - Sequential unlocking
  - Current step highlight
  - Completed steps marked
  - Next step indication

- **Content Viewer**:
  - Embedded content display
  - Support for:
    - Books (PDF/Web)
    - Videos (Embedded/Redirect)
    - Interactive content
    - Notes

- **Security Features**:
  - Watermarks (student name + timestamp)
  - Disabled right-click
  - Disabled text selection
  - Disabled copy/paste
  - Screenshot protection
  - Session-based access

- **Progress Submission**:
  - Mark step as complete
  - Auto-unlock next step
  - Progress tracking
  - Timestamp recording

#### Self-Paced Learning
- **Browse Content**:
  - All available content
  - Filter by subject
  - Filter by type
  - Search functionality

- **Bookmarks**:
  - Save for later
  - Personal library

---

## 7. Competency Framework

### Overview
**Role**: BITFLOW_OWNER  
**Access**: Manage MCI competencies  
**Route**: `/competencies`

### Features

#### Dashboard
- **Statistics Cards**:
  - Total Competencies (2929)
  - Active Competencies
  - Draft Competencies
  - Deprecated Competencies
  - Unique Subjects (24)

- **Subjects Grid**:
  - All subjects with competency count
  - Click to filter

- **Governance Info**:
  - Creation policy
  - Review process
  - Activation rules
  - Deprecation policy

#### Browse Competencies
- **List View**:
  - All competencies
  - Pagination
  - Search by code/title/description/subject

- **Filters**:
  - Status (DRAFT, ACTIVE, DEPRECATED)
  - Domain (COGNITIVE, CLINICAL, PRACTICAL)
  - Academic Level (UG, PG, SPECIALIZATION)
  - Subject

- **Sorting**:
  - By code
  - By creation date
  - Ascending/Descending

#### Create Competency
- **Form Fields**:
  - Code (unique identifier)
  - Title (short title)
  - Description (detailed)
  - Subject
  - Domain (COGNITIVE, CLINICAL, PRACTICAL)
  - Academic Level (UG, PG, SPECIALIZATION)

- **Validation**:
  - Unique code check
  - Required fields
  - Format validation

#### Manage Competency
- **Actions**:
  - View details
  - Edit (draft only)
  - Activate (requires review)
  - Deprecate (active only)

- **Status Flow**:
  - DRAFT → ACTIVE (via activation)
  - ACTIVE → DEPRECATED (via deprecation)
  - Cannot edit ACTIVE competencies

---

## 8. Content Management

### Overview
**Role**: BITFLOW_OWNER  
**Access**: View all platform content  
**Route**: `/content-management`

### Features

#### Overview Tab
- **Statistics by Type**:
  - Books count
  - Videos count
  - Notes count
  - MCQs count
  - Click to filter

- **Statistics by Status**:
  - Active content
  - Draft content
  - Pending mapping
  - Total count

- **Top Publishers**:
  - Publisher ranking
  - Content count
  - Performance metrics

#### Content Tabs
- **Books Tab**:
  - All book-type content
  - Publisher filter
  - Status filter
  - Search
  - Pagination

- **Videos Tab**:
  - All video content
  - Filters and search
  - Duration display

- **Notes Tab**:
  - All note content
  - Filters and search

- **MCQs Tab**:
  - All MCQ content
  - Difficulty filter
  - Subject filter
  - Competency mapping view

#### Content Details
- **View Modal**:
  - Full content information
  - Publisher details
  - Competency mappings
  - Status and dates
  - Analytics
  - Preview option

- **Actions**:
  - Edit (publisher only)
  - Change status (owner only)
  - View analytics
  - Download

---

## 9. Common Features

### Authentication
- **Login**:
  - Email/Password
  - Role-based redirect
  - Remember me
  - Token management

- **Logout**:
  - Clear session
  - Redirect to login

- **Password Management**:
  - Change password
  - Reset password (admin)
  - Password requirements

### Navigation
- **Sidebar**:
  - Glassmorphic design
  - Animated gradient background
  - Floating orbs
  - Navigation items with icons
  - Active state indication
  - User info display
  - Logout button

- **Breadcrumbs**:
  - Current location
  - Navigation path

### UI Components
- **GlassStatCard**:
  - Icon display
  - Value and label
  - Optional badge
  - Optional footer
  - Hover effects
  - Click actions

- **GlassButton**:
  - Primary variant
  - Secondary variant
  - Danger variant
  - Icon support
  - Loading state

- **GlassInput**:
  - Text input
  - Number input
  - Textarea
  - Select dropdown
  - File upload
  - Validation states

- **GlassModal**:
  - Overlay backdrop
  - Content area
  - Header with close
  - Footer with actions
  - Animation

- **Tables**:
  - Sortable columns
  - Pagination
  - Row selection
  - Action buttons
  - Empty state

- **Cards**:
  - Glassmorphic effect
  - Header section
  - Content area
  - Footer section
  - Hover effects

### Notifications
- **Toast Messages**:
  - Success notifications
  - Error notifications
  - Warning notifications
  - Info notifications
  - Auto-dismiss
  - Stack support

### Loading States
- **Spinners**:
  - Full page loader
  - Component loader
  - Button loader
  - Skeleton screens

### Error Handling
- **Error Display**:
  - Error banners
  - Inline errors
  - Form validation errors
  - API error messages

### Responsive Design
- **Breakpoints**:
  - Desktop (>1024px)
  - Tablet (768px-1024px)
  - Mobile (<768px)

- **Adaptive Layouts**:
  - Collapsible sidebar
  - Stacked cards
  - Responsive tables
  - Touch-friendly buttons

### Accessibility
- **ARIA Labels**:
  - Screen reader support
  - Keyboard navigation
  - Focus indicators
  - Alt text for images

### Performance
- **Optimization**:
  - Lazy loading
  - Code splitting
  - Image optimization
  - Caching strategy

---

## Design System Overview

### Current Theme (Glassmorphic)
- **Colors**:
  - Primary: Teal gradient (#006B5C → #00A896 → #00C9B7)
  - Background: Animated gradient
  - Glass effect: rgba(255,255,255,0.95) with blur(20px)
  - Text: Dark gray on light backgrounds

- **Typography**:
  - Font family: Inter
  - Headings: 600-800 weight
  - Body: 400-500 weight

- **Effects**:
  - Backdrop blur
  - Box shadows
  - Hover animations
  - Floating orbs
  - Gradient shifts

---

## Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **UI Components**: Custom components
- **Styling**: CSS with glassmorphic design
- **Icons**: Lucide React
- **Forms**: Controlled components

### Backend Integration
- **API Base**: http://localhost:3001/api
- **Authentication**: JWT tokens
- **Authorization**: Role-based access control
- **File Upload**: Multipart form data
- **Real-time**: REST polling

---

## Routes Summary

| Route | Role | Description |
|-------|------|-------------|
| `/` | Public | Login page |
| `/dashboard` | BITFLOW_OWNER | Owner dashboard |
| `/competencies` | BITFLOW_OWNER | Competency framework |
| `/content-management` | BITFLOW_OWNER | Content library |
| `/publisher-admin` | PUBLISHER_ADMIN | Publisher dashboard |
| `/publisher-admin/create` | PUBLISHER_ADMIN | Create learning unit |
| `/publisher-admin/view/:id` | PUBLISHER_ADMIN | View learning unit |
| `/publisher-admin/edit/:id` | PUBLISHER_ADMIN | Edit learning unit |
| `/publisher-admin/mcqs` | PUBLISHER_ADMIN | MCQ management |
| `/publisher-admin/profile` | PUBLISHER_ADMIN | Publisher profile |
| `/college-admin` | COLLEGE_ADMIN | College dashboard |
| `/college-admin/students` | COLLEGE_ADMIN | Student management |
| `/college-admin/create-student` | COLLEGE_ADMIN | Create student |
| `/college-admin/bulk-upload` | COLLEGE_ADMIN | Bulk student upload |
| `/dean` | DEAN | Dean dashboard |
| `/faculty` | FACULTY | Faculty dashboard |
| `/faculty/create-course` | FACULTY | Create course |
| `/faculty/edit-course/:id` | FACULTY | Edit course |
| `/faculty/assign/:id` | FACULTY | Assign course |
| `/faculty/analytics/:id` | FACULTY | Course analytics |
| `/student` | STUDENT | Student dashboard |
| `/student/course/:id` | STUDENT | Course view |
| `/student/portal` | STUDENT | Student portal |
| `/student/self-paced` | STUDENT | Self-paced learning |
| `/student/progress` | STUDENT | Progress tracking |

---

## Data Flow

### User Authentication Flow
1. User enters credentials
2. Frontend sends POST to `/auth/login`
3. Backend validates and returns JWT
4. Frontend stores token
5. Frontend redirects based on role
6. Token sent with all subsequent requests
7. Auto-refresh on expiry

### Content Creation Flow (Publisher)
1. Publisher creates learning unit
2. Fills form with details
3. Uploads content file
4. Maps to competencies
5. Submits to backend
6. Backend validates and stores
7. Returns success/error
8. Frontend updates UI

### Course Assignment Flow (Faculty)
1. Faculty creates course
2. Designs learning flow
3. Publishes course
4. Selects students
5. Assigns course
6. Backend creates assignments
7. Students notified
8. Appears in student dashboard

### Progress Tracking Flow (Student)
1. Student accesses course
2. Views learning path
3. Clicks on unlocked step
4. Content loads in viewer
5. Student consumes content
6. Marks step complete
7. Backend records progress
8. Next step unlocks
9. Dashboard updates

---

## API Integration Points

### Authentication APIs
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- POST `/api/auth/logout`
- GET `/api/auth/me`
- POST `/api/auth/change-password`

### Bitflow Owner APIs
- GET `/api/bitflow-owner/dashboard`
- GET `/api/bitflow-owner/publishers`
- GET `/api/bitflow-owner/colleges`
- GET `/api/bitflow-owner/analytics`
- GET `/api/bitflow-owner/audit-logs`
- PATCH `/api/bitflow-owner/security-policy`
- PATCH `/api/bitflow-owner/feature-flags`

### Competency APIs
- GET `/api/competencies`
- POST `/api/competencies`
- GET `/api/competencies/:id`
- PUT `/api/competencies/:id`
- POST `/api/competencies/:id/activate`
- POST `/api/competencies/:id/deprecate`
- GET `/api/competencies/stats`
- GET `/api/competencies/subjects`

### Learning Unit APIs
- GET `/api/learning-units`
- POST `/api/learning-units`
- GET `/api/learning-units/:id`
- PUT `/api/learning-units/:id`
- DELETE `/api/learning-units/:id`
- GET `/api/learning-units/stats`
- GET `/api/learning-units/analytics`
- POST `/api/learning-units/upload`

### Course APIs
- GET `/api/courses`
- POST `/api/courses`
- GET `/api/courses/:id`
- PUT `/api/courses/:id`
- DELETE `/api/courses/:id`
- POST `/api/courses/:id/publish`
- POST `/api/courses/assign`
- GET `/api/courses/:id/analytics`

### Progress APIs
- GET `/api/progress/my-courses`
- GET `/api/progress/course/:courseId`
- POST `/api/progress/check-access/:stepId`
- POST `/api/progress/submit`

### Student APIs
- GET `/api/students`
- POST `/api/students`
- PUT `/api/students/:id`
- POST `/api/students/bulk-upload`
- POST `/api/students/:id/reset-password`

---

## End of Documentation
