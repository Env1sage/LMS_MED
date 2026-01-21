
📘 Bitflow Medical LMS
PHASE 5 — FACULTY PORTAL & LEARNING FLOW ENGINE
(Ultra-Detailed | Academic Orchestration Layer)

1️⃣ Phase Objective & Academic Responsibility
The objective of Phase 5 is to empower faculty to orchestrate structured learning journeys while explicitly preventing content ownership or security bypass.
In this phase:
Faculty decide WHAT is learned
Faculty decide IN WHAT ORDER
Faculty decide WHAT IS MANDATORY
The system enforces HOW it must be completed
Faculty act as learning architects, not content owners.

2️⃣ Faculty Authority Boundary (Critical)
Faculty CAN:
Create courses
Design learning flows
Assign content sequences
Assign MCQs
Monitor student completion & performance
Faculty CANNOT:
Upload books or videos
Download publisher content
Bypass access rules
Override security policies
Modify competencies
This separation is strictly enforced server-side.

3️⃣ Course Concept & Structure
3.1 What is a Course?
A Course is a faculty-defined container that:
Groups learning units
Applies an ordered sequence
Enforces progression rules
Courses do not contain files — only references.

4️⃣ Learning Flow Engine (Core System)
4.1 Learning Flow Definition
Each course contains a Learning Flow, defined as an ordered list of steps.
Each step includes:
stepId
learningUnitId
stepOrder
stepType (VIDEO / BOOK / MCQ / NOTES)
mandatory (true/false)
completionCriteria

4.2 Completion Rules (Hard Enforcement)
Content Type
Completion Condition
Video
≥ X% watched (configurable)
Book
Minimum read duration
Notes
Scroll completion
MCQ
Attempt submitted

Completion is validated only by backend events.

5️⃣ Flow Blocking Logic (Non-Skippable)
5.1 Mandatory Steps
If a step is marked mandatory:
Next steps are locked
UI shows blocked state
API denies access to future steps
5.2 Optional Steps
Optional steps:
Can be skipped
Still tracked for analytics

6️⃣ Course Assignment Engine
6.1 Assignment Targets
Faculty can assign courses to:
Entire batch
Individual students
6.2 Assignment Constraints
Assignment checks:
Student academic year
College entitlement
Student status = ACTIVE
Invalid assignments are rejected server-side.

7️⃣ Competency Integration (Read-Only)
Faculty can:
Select Bitflow-defined competencies
View competency coverage per course
Faculty cannot:
Edit competency definitions
Auto-map competencies
Create custom competencies
Competencies act as academic labels, not logic drivers.

8️⃣ Faculty Analytics & Monitoring
8.1 Student Tracking
Faculty can see:
Who started
Who completed
Completion %
MCQ scores
Attempt counts
8.2 Reports
Downloadable performance reports
Batch-wise summaries
Course-wise progress
❌ No cross-college visibility
❌ No access to raw content data

9️⃣ Data Models (Technical)
9.1 Course Table
courseId
facultyId
collegeId
academicYear
status
createdAt
9.2 Learning Flow Table
flowId
courseId
stepOrder
learningUnitId
mandatory
9.3 Assignment Table
assignmentId
courseId
studentId / batchId

10️⃣ Backend Enforcement (Critical)
10.1 Runtime Validation
Every content request validates:
Course assignment
Step completion state
Mandatory blocking rules
Academic year eligibility
10.2 Tampering Protection
If frontend attempts:
Step skipping
Forced unlock
API replay
→ Request denied + audit log written.

🔐 11️⃣ Security & Abuse Prevention
Handled Scenarios:
Credential sharing
Parallel session abuse
Forced API calls
Enforcements:
Session binding
Device fingerprint checks
Token invalidation

12️⃣ Edge Case Handling
12.1 Course Modified Midway
Existing progress preserved
New steps locked until reached
12.2 Faculty Removed
Courses remain active
Reassignable to another faculty
12.3 Student Drops Course
Progress frozen
Analytics retained

13️⃣ Audit Logging (Mandatory)
Logged Events:
Course creation
Flow modification
Assignment changes
Step completion
Blocked access attempts
Logs are:
Immutable
Timestamped
College-scoped

14️⃣ Explicit Phase 5 Exclusions
Phase 5 does NOT include:
Student UI
Notifications
Offline access
AI recommendations
Marketplace features

✅ Phase 5 Completion & Approval Criteria
Phase 5 is approved only when:
Faculty can create structured courses
Learning flow blocking is enforced
Mandatory steps cannot be skipped
Course assignments validate eligibility
Analytics reflect real completion
Security bypass is impossible


