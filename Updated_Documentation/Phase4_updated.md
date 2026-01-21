
📘 PHASE 4
College Admin / Dean / IT Admin Portal – Institutional Governance & Academic Control
(Institution-Level Authority | Operational Backbone of the LMS)
This phase defines how a college actually operates inside the LMS.
If Phase 2 is the government and Phase 3 is the content supply,
Phase 4 is the administration that runs the institution day-to-day.

1. Phase Overview
Phase Name
Phase 4: College Admin Portal – Institutional Management & Control Layer
Phase Type
Operational governance phase
User & permission heavy
Analytics + enforcement focused
High UI + backend dependency
Hierarchy Position
⬇ Below Publisher
⬆ Above Teacher
Colleges do not own the platform and do not own content,
but they own users, structure, and academic execution.

2. Strategic Objective of Phase 4
This phase ensures that:
Each college functions as an independent academic entity
Colleges control who teaches, who studies, and who sees what
Institutional policies are enforced digitally
Academic accountability is measurable
The LMS scales to multiple colleges without data leakage
This phase converts the LMS into a multi-tenant institutional system.

3. College Admin Roles – Internal Hierarchy
Within a college, sub-roles exist but all roll up to the College Admin.
3.1 Role Types
IT Admin
System configuration
User onboarding
Technical access control
Dean / Principal
Academic oversight
Performance monitoring
Strategic visibility
HOD (Head of Department)
Department-level monitoring
Faculty supervision
All roles are scoped strictly to one college.

4. College Authentication & Account Security
4.1 Account Creation
College admin accounts are created by Bitflow Owner
Credentials are sent via secure email
First login forces password reset
4.2 Login Rules
Email + password
Role-based dashboard rendering
Session timeout enforced
4.3 Recovery & Audit
Email-based password reset
All admin actions logged
Failed login attempts tracked

5. College Profile & Structure Setup
5.1 College Profile (Read-Only + Editable)
College can view:
College name
Registration details
Activation status
College can manage:
Logo
Contact email
Internal identifiers

5.2 Academic Structure Configuration
College Admin defines:
Departments
Programs
Academic years
Batches / divisions
This structure becomes the base reference for:
Teacher assignment
Student enrollment
Course creation
Analytics filtering

6. Faculty Management (Critical Module)
6.1 Faculty Onboarding
Admin can:
Add faculty manually or via bulk upload
Assign:
Department
Subject(s)
Role permissions
System automatically:
Creates faculty login
Sends credentials via email

6.2 Faculty Permission Control (Very Important)
For each teacher, admin can enable/disable:
Course creation
Course editing
MCQ creation
Analytics visibility
Assignment creation
This allows junior vs senior faculty differentiation

6.3 Faculty Lifecycle
Faculty states:
Active
Temporarily disabled
Permanently removed (soft delete)
Disabled faculty:
Cannot log in
Courses remain intact
Data preserved

7. Student Management
7.1 Student Onboarding
Admin can:
Add students (manual / bulk)
Assign:
Department
Academic year
Batch
System automatically:
Generates login credentials
Emails students securely

7.2 Student Lifecycle
Student states:
Active
Suspended
Alumni (future-ready)
Suspended students:
Cannot access content
Data retained for records

8. Course & Subject Governance (College View)
8.1 Subject Assignment
Admin defines:
Which subjects belong to which department
Which faculty can teach which subject
This prevents:
Cross-department teaching
Unauthorized course creation

8.2 Course Oversight
Admin can:
View all courses in the college
See course ownership (faculty)
See completion status
Admin cannot:
Edit course content
Modify assessments
Interfere in teaching flow

9. Institutional Analytics & Monitoring
9.1 College-Level Analytics
Admin & Dean can view:
Course completion rates
Faculty activity levels
Student engagement trends
Test participation ratios

9.2 Department-Level Analytics (HOD)
HOD can view:
Teachers under their department
Subject-wise progress
Department-wise student performance
HOD cannot:
See other departments
Change permissions

10. Permission Enforcement Logic
10.1 Visibility Rules
Role
Can See
IT Admin
Users + structure
Dean
Analytics + summaries
HOD
Department analytics
Teacher
Subject analytics
Student
Personal analytics


10.2 Enforcement Method
Role-based middleware
Department scoping at query level
No frontend-only restrictions

11. Notifications & Institutional Communication
College Admin can:
Send announcements
Notify schedule changes
Broadcast academic notices
Notifications:
Appear on web + mobile
Logged for audit

12. Compliance, Logs & Safeguards
12.1 Logged Actions
User creation
Permission changes
Faculty assignment
Student suspension
12.2 Safeguards
No hard deletes
No cross-college access
No publisher data exposure

13. Technical Architecture Impact
Backend
Tenant-based isolation
Role-permission engine
Analytics aggregation (college-scoped)
Database
College table
Department table
Faculty table
Student table
Permission mapping table

14. Edge Case Handling
Faculty removed mid-semester → courses remain
Student batch change → content auto-adjusted
Department deletion → blocked if active users exist

15. Phase 4 Deliverables
At the end of Phase 4:
College operates independently
Permissions are enforceable
Analytics are reliable
Academic structure is digitized


