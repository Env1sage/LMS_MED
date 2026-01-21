
📘 Bitflow Medical LMS
PHASE 4 — COLLEGE ADMIN PORTAL (OPERATIONAL CONTROL)
(Ultra-Detailed | Identity, Lifecycle & Access Governance)

1️⃣ Phase Objective & Role in the System
The objective of Phase 4 is to give each college strict operational control over who can access the LMS, when, and under what academic context, without granting any academic or content authority.
This phase ensures:
No unauthorized student ever accesses the platform
No self-signup loopholes exist
Academic year–based access is enforced system-wide
Identity ownership stays with the college, not students
In this model, Bitflow controls the platform,
but the college controls student identity lifecycle.

2️⃣ College Admin Portal — Authority Boundary
2.1 What the College Admin IS
Identity administrator
Access gatekeeper
Academic year controller
2.2 What the College Admin is NOT
Not a content manager
Not a course creator
Not an analytics authority
Not a competency manager
This strict boundary prevents:
Academic tampering
Data overreach
Privacy violations

3️⃣ Student Identity Model (Minimal & Controlled)
3.1 Allowed Student Data (Hard-Limited)
College Admin can manage only the following fields:
studentId (system generated)
Full Name
Year of Admission
Expected Passing Year
Current Academic Year (FY / SY / TY / Final Year)
Status (Active / Inactive)
🚫 Explicitly forbidden:
Aadhaar
Address
Phone number
Personal email
Any unnecessary PII

4️⃣ Student Login Creation & Credential Control
4.1 No Self-Signup Rule (Critical)
Students cannot self-register
Every student account must be created by College Admin
Login credentials issued via Bitflow SSO
4.2 Credential Lifecycle
College Admin can:
Create login
Activate login
Deactivate login
Reset credentials
When a student is inactive:
Login is blocked
Tokens are invalidated
All access is revoked immediately

5️⃣ Academic Year Lifecycle Management
5.1 Academic Year as a System Constraint
Academic year controls:
Content visibility
Course eligibility
Faculty assignment
MCQ attempt permissions
5.2 Year Progression Workflow
College Admin can:
Promote students in bulk
Update current academic year annually
System automatically:
Applies correct access rules
Adjusts course visibility
Updates entitlement checks
❗ No manual override by students or faculty.

6️⃣ Access Control Enforcement (Backend-Only)
6.1 Runtime Access Validation
Every request from a student validates:
studentId
collegeId
academicYear
status = ACTIVE
Entitlement rules
If any check fails → access denied + audit log.

7️⃣ College Admin Functional Capabilities
7.1 Dashboard (Operational Only)
Total students (active/inactive)
Year-wise distribution
Login status summary
No:
Academic analytics
Performance metrics
Content analytics

8️⃣ Data Model (Technical)
8.1 Student Table (Simplified)
Key fields:
studentId
collegeId
currentAcademicYear
status
createdAt
updatedAt
Strict foreign key enforcement with collegeId.

9️⃣ Security & Abuse Prevention
9.1 Abuse Scenarios Handled
Credential sharing → detected via session mismatch
Unauthorized login → blocked at SSO
Alumni access → blocked via academic year rules
9.2 Hard Enforcement
One identity = one student
No duplicate active accounts
No cross-college access possible

🔍 10️⃣ Audit Logging (Mandatory)
Logged events:
Student creation
Credential activation/deactivation
Academic year updates
Bulk promotions
Login failures
Logs are:
Append-only
Immutable
College-scoped
Visible to Bitflow Owner only

11️⃣ Edge Case Handling
11.1 Student Drops Out
Status set to INACTIVE
Immediate access revocation
Historical data retained for analytics
11.2 Rejoining Student
Account reactivated
Academic year reassigned
No data loss
11.3 College Suspended (From Phase 1)
All student logins auto-blocked
No manual override possible

12️⃣ Explicit Phase 4 Exclusions
Phase 4 does NOT include:
Faculty onboarding
Course creation
Learning flow logic
Competency access control
Student analytics dashboards

✅ Phase 4 Completion & Approval Criteria
Phase 4 is approved only if:
College Admin can create & manage student logins
No self-signup path exists
Academic year rules are enforced system-wide
Inactive students are fully blocked
No excess PII is stored
All actions are audit-logged


