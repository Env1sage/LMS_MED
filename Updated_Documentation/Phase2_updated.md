
📘 PHASE 2
Bitflow Owner Portal – Platform Governance, Control, Security & Oversight
(Root-Level Authority Implementation Phase)

1. Phase Identity & Purpose
Phase Name
Phase 2: Bitflow Owner Portal – Global Governance Layer
Phase Classification
Platform Core Phase
Governance & Compliance Phase
Security-Critical Phase
Dependency Root Phase
Position in Hierarchy
🔝 Absolute Top Layer
All other portals (Publisher, College, Teacher, Student) are children of this phase.
If this phase is weak, every other phase becomes insecure, inconsistent, or legally risky.

2. Strategic Objective of Phase 2
This phase exists to ensure that:
The LMS operates as one governed platform, not fragmented college systems
Ownership, responsibility, and accountability are clearly enforced
Legal, security, and compliance risks are centrally controlled
Analytics are aggregated, neutral, and non-intrusive
No academic stakeholder can bypass platform rules
The Bitflow Owner controls the system,
but does not participate in academics.

3. Bitflow Owner Role – Conceptual Definition
Nature of the Role
Platform Operator
Neutral Authority
Non-academic
Read-heavy, Control-light
Core Philosophy
“Maximum visibility, minimum interference.”
The Owner:
Sees everything at a macro level
Changes very little directly
Governs rules, not outcomes

4. Authentication & Identity Management
4.1 Owner Account Characteristics
Predefined role: BITFLOW_OWNER
Cannot be downgraded
Cannot be duplicated casually
Created only at system level (not via UI)
4.2 Login Mechanism
Email + password authentication
Strong password enforcement:
Minimum length
Complexity rules
Rotation policy (future-ready)
4.3 Session Control
Single-session or limited concurrent sessions
Auto-expiry after inactivity
Manual session revocation capability
4.4 Recovery & Security
Email-based password reset
Token-based verification
All recovery attempts logged

5. Owner Dashboard – Global Visibility Layer
5.1 Dashboard Design Principle
Read-only by default
Aggregated data only
No personal data exposure

5.2 Platform Overview Metrics
Displayed as high-level KPIs:
Total onboarded colleges
Active vs inactive colleges
Total publishers onboarded
Active publisher contracts
Total users (faculty + students)
Daily / monthly active users
Total content items by type:
Books
Notes
MCQs
Videos
No drill-down into individual identities.

5.3 Platform Activity Trends
Login trends (time-based)
Content access frequency
Test participation volume
Peak system usage windows
Purpose:
Capacity planning
Stability monitoring
Business insights

6. College Lifecycle Management (Master Control)
6.1 College Onboarding Flow
Owner can:
Register a new college
Capture core metadata:
College name
Official email domain
Admin contact email
Trigger automated credential generation
System automatically:
Creates IT Admin account
Creates Dean account
Sends secure login credentials via email

6.2 College State Management
Each college has a lifecycle state:
Active
Full access
Suspended
Login disabled
Content hidden
Data preserved
Disabled
Long-term block
Access fully frozen
State changes are non-destructive

6.3 College Metadata Governance
Owner can:
View department structure
View academic year configurations
View high-level usage stats
Owner cannot:
Add faculty
Add students
Edit courses
Modify internal college policies

7. Publisher Governance & Oversight
7.1 Publisher Onboarding
Owner can:
Create publisher profile
Define:
Legal name
Contact person
Email
Contract duration
System enforces:
One publisher = one legal entity
Contract dates govern content availability

7.2 Publisher Status Control
Publisher states:
Active
Expired
Suspended
State impact:
Expired → content auto-deactivated
Suspended → uploads blocked, content hidden
Active → normal operation

7.3 Publisher Monitoring Metrics
Owner can view:
Total content uploaded
Content type distribution
Competency mapping completion
Number of colleges using content
Owner cannot:
Edit content
View content text
Modify legal documents

8. Global Analytics Engine (Rules-Based)
8.1 Analytics Philosophy
Descriptive, not predictive
Aggregated, not personal
Policy-compliant
8.2 Analytics Sources
Faculty activity logs
Student engagement metrics
College admin operations
Publisher uploads

8.3 Owner-Visible Analytics
Subject popularity trends
Average course completion rates
Assessment participation ratios
Platform growth indicators

8.4 Explicitly Hidden Data
Owner cannot see:
Student answers
Student names
Faculty internal notes
Individual test scores

9. Audit Logs & Compliance Framework
9.1 Audit Scope
Every critical action is logged:
Login / logout
Account creation
Permission change
Content activation
Package assignment
College / publisher status change

9.2 Audit Log Properties
Each log entry stores:
Actor role
Action performed
Timestamp
Affected entity
Source portal
9.3 Audit Rules
Logs are append-only
Logs cannot be edited
Logs cannot be deleted
Logs retained for compliance

10. Platform Policy Enforcement Layer
10.1 Policies Defined at Owner Level
Password standards
Content download defaults
Watermark enforcement
Session timeout rules
10.2 Enforcement Mechanism
Central policy engine
Evaluated on every API request
Overrides portal-specific behavior

11. Data Ownership & Modification Matrix
Entity
View
Modify
Colleges
✅
Status only
Publishers
✅
Status only
Faculty
❌
❌
Students
❌
❌
Courses
❌
❌
Content
❌
❌


12. Edge Case Handling
College suspension → cascades to all users
Publisher expiry → content auto-hidden
Audit overflow → system alert
Invalid permission attempt → logged & blocked

13. Technical Impact Summary
Backend
Root-level access middleware
Policy enforcement service
Analytics aggregation service
Database
Owner master table
College registry
Publisher registry
Audit log store
API
Owner-only endpoints
Read-dominant design
No academic mutation APIs

14. Phase 2 Deliverables (Final)
At the end of Phase 2:
Bitflow Owner Portal is operational
Governance is enforceable
Security rules are centralized
Platform is audit-ready
Lower portals can safely exist

15. Phase Dependency Lock
🚫 Phase 3 cannot start without Phase 2 approval


