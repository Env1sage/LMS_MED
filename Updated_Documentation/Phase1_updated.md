UPDATED LMS

📘 PHASE 1
Requirement Alignment, Governance Model & Hierarchical System Architecture
(Foundational Phase – System Constitution)

1. Phase Overview
Phase Name
Phase 1: Governance, Scope Lock & Hierarchical Authority Definition
Phase Type
Strategic
Architectural
Non-UI
Non-Coding
Nature
This phase defines how power, control, visibility, and responsibility flow across the LMS.
Think of this phase as the Constitution of the LMS.
Every future feature, API, database table, UI screen, and permission rule must obey this phase.

2. Core Objective of Phase 1
The objective of Phase 1 is to:
Align new business requirements with the existing LMS Books Project
Define a strict authority hierarchy to prevent future conflicts
Lock scope boundaries (what will NOT be built now)
Define ownership of data, content, and analytics
Create a governance-first architecture suitable for multi-college scaling
This phase ensures the system is:
Secure
Scalable
Auditable
Legally compliant
Institution-friendly

3. System Authority Hierarchy (Locked & Final)
This hierarchy is absolute, platform-wide, and non-overridable.

🔝 Level 1: Bitflow Owner
(Platform Authority & Root Controller)
Role Definition
The Bitflow Owner is the root authority of the entire LMS ecosystem.
They own the platform, not the academic operations.

Powers & Responsibilities
3.1 Platform Governance
Enable / disable colleges
Enable / disable publishers
Control global system settings
Define security policies
Control analytics aggregation logic
3.2 Data Oversight
View cross-college analytics
View cross-publisher activity
View system-wide usage trends
View audit logs across all portals
3.3 Security Control
Enforce password policies
Enforce login recovery mechanisms
Define content safety rules
Define watermarking standards

Explicit Restrictions
Bitflow Owner CANNOT:
Create or edit academic courses
Upload books or notes
Teach students
Attempt tests
Modify publisher content directly
This separation ensures neutral platform governance.

🟠 Level 2: Publisher
(Content Ownership & Legal Authority)
Role Definition
Publishers are content owners, not educators.
They provide licensed educational material to the platform.

Powers & Responsibilities
3.4 Content Management
Upload books, notes, MCQs, videos
Update content metadata
Control visibility of content
Activate / deactivate content
3.5 Legal & Compliance Control
Upload licensing agreements
Upload copyright documents
Define contract duration
Maintain compliance records
3.6 Content Protection Rules
Enable watermarking (user identity-based)
Control download permissions:
View-only (default)
Download allowed (explicit)
3.7 Competency Mapping (Manual Only)
Map each content item to:
Subject
Competency
Academic relevance
❗ If competency mapping is missing → content remains inactive

Explicit Restrictions
Publishers CANNOT:
See student names or data
See college-level analytics
Assign content directly to students
Control teaching flow

🟡 Level 3: College Admin / Dean / IT Admin
(Institutional Governance Authority)
Role Definition
This role represents the college as an institution.
They govern people, structure, and permissions within their college.

Powers & Responsibilities
3.8 User Management
Add / update / deactivate faculty
Add / update / deactivate students
Assign departments
Assign academic years & batches
3.9 Permission Control
Decide which teacher can:
Create courses
Edit courses
Create MCQs
View analytics
Define role-based access per faculty
3.10 Institutional Analytics
View:
Teacher productivity
Course completion rates
Student performance trends
Filter analytics:
Department-wise
Subject-wise
Faculty-wise
3.11 Department-Level Access (HOD)
HODs can view:
Teachers under their department
Department-wise student performance
Teaching progress

Explicit Restrictions
College Admin CANNOT:
Edit publisher content
Access other colleges
Override platform security rules
Access Bitflow-level analytics

🔵 Level 4: Teacher / Faculty
(Academic Execution Authority)
Role Definition
Teachers execute learning based on institutional and platform rules.
They are content curators and assessors, not content owners.

Powers & Responsibilities
3.12 Course Creation
Create courses for:
Assigned subjects
Assigned batches
Reuse approved content
Upload personal notes & PPTs (view-only)
3.13 Teaching Flow Control
Define learning sequence
Assign:
Tests
Assignments
Practice material
Mark lectures as mandatory
3.14 Assessment Control
Create MCQs (manual only)
Add explanations for every MCQ
Edit or replace questions
Track student attempts
3.15 Subject-Specific Analytics
View:
Engagement
Completion percentage
Test performance
Filter students:
High performers
Average performers
Low performers

Explicit Restrictions
Teachers CANNOT:
See other subjects
See other departments
Download content
Access institutional analytics
Modify publisher rules

🟢 Level 5: Student
(Learning Consumer)
Role Definition
Students are end users of learning, with no authority over system structure.

Powers & Responsibilities
3.16 Learning Access
View assigned:
Books
Videos
MCQs
Notes
Access content in My Library
3.17 Test Lifecycle
View:
Upcoming tests
Active tests
Completed tests
Attempt tests within rules
3.18 Practice & Revision
Access practice tests
Reattempt questions
Learn without time pressure
3.19 Personal Analytics
View:
Subject-wise performance
Strengths & weaknesses
3.20 Account Security
Reset password
Email-based verification

Explicit Restrictions
Students CANNOT:
Download content
Skip mandatory lectures
View other students’ data
Modify learning paths

4. Scope Lock for This Update
✅ INCLUDED
Role-based portals (5 levels)
Secure content viewing
Manual MCQ creation
Analytics with strict visibility
Packages & bundles
Competency mapping (manual)
❌ EXCLUDED (Frozen)
❌ AI MCQ generation
❌ AI analytics
❌ AI recommendations
❌ Offline access
❌ Free downloads

5. Technical Impact of Phase 1
This phase directly affects:
Database role tables
Permission schemas
API access control
Analytics queries
UI visibility rules
Audit logging

6. Phase 1 Deliverables (Locked Outputs)
By the end of Phase 1, we finalize:
Authority hierarchy
Role boundaries
Scope exclusions
Ownership rules
Data visibility constraints
These cannot be violated in later phases.

7. Dependency Declaration
🚫 No further phase may start unless Phase 1 is approved
Reason:
Every next phase is a child of this phase.



