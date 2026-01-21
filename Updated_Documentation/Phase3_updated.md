
📘 PHASE 3
Publisher Portal – Content Ownership, Protection & Compliance Layer
(Second-Highest Authority | Non-Academic | Legally Critical)
This phase defines how content enters the platform, stays protected, remains compliant, and becomes eligible for academic use — without allowing publishers to interfere in teaching or student data.

1. Phase Overview
Phase Name
Phase 3: Publisher Portal – Content Governance & Legal Control
Phase Type
Content lifecycle phase
Legal & compliance phase
Security-sensitive phase
Read–write (content only), no academic authority
Hierarchy Position
⬇ Below Bitflow Owner
⬆ Above College Admin
Publishers own content, not students, courses, or institutions.

2. Strategic Objective of Phase 3
This phase ensures that:
Only authorized, licensed content exists on the platform
Content is secure, traceable, and protected
Academic stakeholders use approved material only
Legal risk is minimized through controlled access
Content becomes usable only after competency mapping
This phase converts the LMS from a file-sharing system into a legally compliant learning platform.

3. Publisher Role – Conceptual Definition
Nature of Role
Content Owner
Legal Authority
Non-academic
Non-institutional
Publisher Philosophy
“We provide content, not control learning.”
Publishers:
Upload & manage content
Protect intellectual property
Ensure curriculum alignment
Publishers do not:
Teach
Assess
Assign content to students
View learning outcomes

4. Publisher Authentication & Account Management
4.1 Account Creation
Publisher accounts are created only by Bitflow Owner
Each publisher represents one legal entity
Multiple logins under one publisher may be allowed (future-ready)
4.2 Login & Security
Email + password authentication
Password rules enforced by platform policy
Email-based password recovery
All login attempts logged for audit

5. Publisher Profile Management
5.1 Editable Profile Fields
Publishers can manage:
Company name
Contact person name
Official email
Physical address
Password
Contract metadata (read-only)
5.2 Read-Only Fields
Contract start date
Contract end date
Publisher status (Active / Expired / Suspended)
Contract rules are enforced automatically by the system.

6. Content Management System (CMS)
6.1 Supported Content Types
Publishers can upload:
E-books (PDF, protected formats)
Notes / reference material
MCQ banks
Video lectures
Each content item is treated as a first-class entity, not just a file.

6.2 Content Upload Flow
Step-by-step:
Select content type
Upload content file
Add metadata:
Title
Subject
Academic relevance
Description
Save as Draft
Draft content is invisible to colleges and teachers.

6.3 Content States (Lifecycle)
Every content item follows a strict lifecycle:
Draft
Editable
Not usable
Pending Mapping
Uploaded
Missing competency mapping
Active
Fully mapped
Eligible for academic use
Inactive
Contract expired
Publisher suspended
Manually disabled

7. Competency Mapping (Mandatory | Manual)
7.1 Why Competency Mapping Exists
Prevents random or irrelevant content usage
Ensures curriculum alignment
Enables structured packages later

7.2 Mapping Rules
For each content item, publisher must map:
Subject
Competency / learning outcome
Academic level (year / program relevance)
7.3 Enforcement
Content cannot become Active without mapping
Teachers cannot see unmapped content
Colleges cannot assign unmapped content
This is a hard system rule, not a suggestion.

8. Content Protection & DRM Logic
8.1 Default Protection Rules
By default:
Content is view-only
Download is disabled
Screen scraping is discouraged (UI-level)
8.2 Watermarking
Publishers can enable watermarks showing:
Logged-in user name
Institution name
Timestamp (optional, future-ready)
Watermarks:
Are dynamic
Cannot be removed by user
Act as legal deterrents

8.3 Download Control (Exceptional)
Publisher may allow downloads:
Only if contract permits
Only for selected content
Always logged
Download events are:
Audited
Traceable to user & college

9. Legal & Compliance Document Management
9.1 Uploadable Legal Documents
Publishers can upload:
Licensing agreements
Copyright certificates
Terms & conditions
9.2 Access Control
Only Bitflow Owner can view all documents
Colleges and teachers cannot view these
Files are stored securely, not public

10. Publisher Dashboard & Analytics (Restricted)
10.1 What Publishers Can See
Total content uploaded
Active vs inactive content
Competency mapping completion
Number of colleges using their content
10.2 What Publishers Cannot See
Student names
Student performance
Test results
Faculty activity details
Analytics are:
Descriptive
Non-academic
Non-personal

11. Restrictions & Hard Boundaries
Publishers CANNOT:
Assign content to students
Create courses
Create tests
Access college dashboards
Modify analytics rules
Bypass competency mapping
Any violation attempt:
Is blocked
Is logged
Is visible to Bitflow Owner

12. Technical Architecture Impact
Backend
Content lifecycle engine
DRM & watermark service
Competency mapping validator
Database
Publisher master table
Content master table
Competency mapping table
Legal document store
API
Publisher-scoped endpoints
Content-state-aware access checks

13. Edge Case Handling
Contract expiry → all content auto-inactive
Publisher suspension → uploads blocked instantly
Incomplete mapping → content hidden everywhere
Illegal access attempt → audit + block

14. Phase 3 Deliverables
By the end of Phase 3:
Publisher Portal is fully functional
All content is legally safe
Content eligibility is enforceable
Colleges receive only approved material

