
📘 Bitflow Medical LMS
PHASE 6 — STUDENT PORTAL (SECURE CONSUMPTION LAYER)
(Ultra-Detailed | Zero Ownership, Zero Leakage, Full Enforcement)

1️⃣ Phase Objective & Philosophy
The objective of Phase 6 is to deliver a single, secure, guided learning interface for students where:
Students consume, not control
Faculty-defined learning flows are strictly enforced
Content is view-only, session-bound, and non-transferable
Every interaction is audited and verifiable
In this phase, Bitflow guarantees that learning happens without content leakage or rule violations.

2️⃣ Student Authority Boundary (Very Important)
Students CAN:
Log in using college-issued credentials
View assigned courses
Follow learning flows
Consume content securely
Attempt MCQs
View scores & progress
Resume from last position
Students CANNOT:
Download any content
Share content links
Skip mandatory steps
Access content outside eligibility
Bypass flow or security
Upload any content
All restrictions are enforced server-side.

3️⃣ Student Login & Session Management
3.1 Authentication
Login via Bitflow SSO
JWT + refresh token
Session bound to:
studentId
collegeId
device fingerprint
platform (web / mobile)
3.2 Session Rules
Concurrent session limits enforced
Token expiry enforced
Inactive / suspended student → instant logout

4️⃣ Student Dashboard (Functional Scope)
4.1 Dashboard Components
Assigned Courses
Course progress indicators
Pending mandatory tasks
Recently accessed content
Notifications (system-generated)
No:
Faculty controls
Course editing
Content browsing without entitlement

5️⃣ Course Consumption Flow (Step-by-Step)
5.1 Course Entry Validation
Before a course opens, backend validates:
Student is ACTIVE
Course is assigned
Academic year eligibility
College entitlement
Failure → access denied + audit log.

5.2 Learning Flow Execution
For each course:
Steps are displayed in order
Locked steps are visually disabled
Only the next allowed step is accessible

6️⃣ Content Access Enforcement (Critical)
6.1 Secure Access Request
When a student opens content:
Client → Bitflow API
Backend validates:
Assignment
Step unlock state
Session validity
Backend generates:
Short-lived access token
Session-specific watermark
Content rendered via:
Secure redirect
Embedded viewer
Tokenized stream
No raw URLs exposed at any point.

7️⃣ Completion Tracking Logic
7.1 Completion Rules
Completion is recorded only when:
Type
Completion Condition
Video
Watch % threshold met
Book
Minimum read duration
Notes
Scroll completion
MCQ
Attempt submitted

Frontend signals are never trusted.

7.2 Blocking Logic
Mandatory step incomplete → next step locked
Backend rejects forced access attempts

8️⃣ MCQ Attempt Engine (Student Side)
8.1 Attempt Rules
Time limits enforced server-side
Attempt limits enforced
Auto-submit on timeout
Answers hidden from client
8.2 Result Visibility
Students can view:
Score
Correct/incorrect summary
Attempt count
No access to:
Correct answer keys
Question bank logic

9️⃣ Progress, Resume & State Persistence
9.1 Resume Capability
Last watched timestamp stored for videos
Last read position stored for books
Partially completed steps retained
9.2 State Storage
Progress stored with:
studentId
courseId
stepId
timestamp
completion status

🔐 10️⃣ Security Enforcement (Student-Specific)
10.1 Web Security
Right-click disabled
Text selection disabled
Print disabled
Session expiry enforced
Dynamic watermark visible
⚠️ Screenshots cannot be fully blocked on web (known limitation)

10.2 Mobile Security (If App Used)
Screenshot detection
Screen recording blocked
Secure WebView
Auto logout on violation
Token invalidation on backgrounding

11️⃣ Abuse & Violation Handling
11.1 Detected Scenarios
Credential sharing
Multiple device abuse
Token replay
Attempted step skipping
11.2 Enforcement
Immediate session termination
Access revocation
Audit log entry
Flag for Bitflow review

12️⃣ Data Models (Technical)
12.1 Student Progress Table
studentId
courseId
stepId
completionStatus
lastAccessedAt
12.2 MCQ Attempt Table
attemptId
studentId
mcqSetId
score
submittedAt

13️⃣ Audit Logging (Mandatory)
Logged Events:
Student login/logout
Content access
Step completion
MCQ attempts
Blocked access attempts
Security violations
Logs are:
Append-only
Immutable
College-scoped
Time-stamped

14️⃣ Explicit Phase 6 Exclusions
Phase 6 does NOT include:
Offline access
Content downloads
AI recommendations
Peer-to-peer interaction
Student uploads
Marketplace access

✅ Phase 6 Completion & Approval Criteria
Phase 6 is approved only when:
Students can access only assigned courses
Learning flow enforcement is strict
Mandatory steps cannot be skipped
Content is fully secured and non-downloadable
MCQ attempts are controlled and audited
All violations are detected and logged


