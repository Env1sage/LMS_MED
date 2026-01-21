📘 Bitflow Medical LMS
PHASE 0 — FOUNDATION & GOVERNANCE SETUP
(This phase is mandatory and blocks all other phases)

🎯 Phase Objective
To establish non-negotiable foundations for the LMS so that security, isolation, authority, and compliance are guaranteed from Day 1.
This phase ensures that:
The platform is enterprise-grade
No future feature can bypass security
All stakeholders operate within strict boundaries

🧱 1. Core Architectural Setup
1.1 Platform Model
Multi-tenant LMS
Single codebase
Strict tenant isolation:
Database level
API level
Each college operates as a logical tenant, with zero data visibility into other colleges.

1.2 Technology Stack (Finalized)
Backend: NestJS
Database: PostgreSQL (Prisma ORM)
Web Frontend: React
Mobile App: React Native / Flutter
Authentication: Custom SSO for Bitflow

🔐 2. Identity, Authentication & Authorization (MANDATORY)
2.1 Central SSO System
Custom Bitflow SSO
JWT + Refresh Token mechanism
Session expiry enforced at backend
2.2 API Security Rules (Hard Enforcement)
Every API request must validate:
userId
role
collegeId
🚫 No frontend trust
Frontend is treated as untrusted
All access rules enforced server-side only

👥 3. Role Framework (Frozen in Phase 0)
Final Roles Created
Bitflow Owner
Publisher Admin
College Admin
College Dean (Analytics only)
College HoD (Analytics only)
Faculty
Student
Role Enforcement Rules
Roles are immutable
No role-based logic allowed on frontend
Backend controls:
Permissions
Visibility
Access boundaries

🧩 4. Tenant & Data Isolation Rules
College Isolation
College A can never see College B:
Users
Courses
Analytics
Content access logs
Visibility Matrix (High Level)
Publisher → Usage analytics only (no student identity)
Faculty → Only assigned students
Dean / HoD → Aggregated analytics only
Bitflow Owner → System-wide metrics only

📜 5. Audit & Compliance Layer (Non-Negotiable)
Logged Events (Append-Only)
Every content access
Every MCQ attempt
Every admin action
Every login & session expiry
Audit Characteristics
Immutable logs
Time-stamped
Tenant-aware
Queryable by Bitflow Owner only

⛔ 6. Explicit Phase 0 Restrictions
This phase does NOT include:
Content viewing
Course creation
Student onboarding
Faculty workflows
Analytics dashboards
➡️ This phase is pure foundation & control

✅ Phase 0 Exit Criteria (Approval Conditions)
Phase 0 is considered complete only if:
Secure authentication is live
Tenant isolation is verified
Role enforcement is backend-controlled
Audit logs are active and immutable
No frontend-based security logic exists

	
