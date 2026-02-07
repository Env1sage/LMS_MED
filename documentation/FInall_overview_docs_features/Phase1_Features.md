
🔐 PORTAL 1: BITFLOW ADMIN (OWNER)
Corrected & Rewritten Sections
This fully replaces the Package, Roles, and Security parts related to the Bitflow Admin portal in your document.

1️⃣ ROLES – BITFLOW ADMIN PORTAL
Role: BITFLOW_OWNER
Purpose
The Bitflow Owner is the platform governance authority.
This role does not create educational content and does not participate in academic workflows.
Responsibilities
Platform-wide governance
Publisher onboarding & control
Subject & content visibility governance
Content Package creation and assignment
Security & compliance oversight
Explicit Permissions
The Bitflow Owner CAN:
Create, edit, activate, suspend publishers
View all colleges across the platform
Approve or restrict subjects derived from publisher content
Create and manage Content Packages
Assign content packages to colleges
View system-wide audit logs
Enforce platform-level security policies
The Bitflow Owner CANNOT:
Create learning units, MCQs, or courses
Modify publisher-created academic content
Enroll students or faculty
Access college/faculty/student portals as a user

Optional Role: BITFLOW_SUB_ADMIN (If Enabled)
⚠️ Optional, not mandatory
Read-only or limited write access
Cannot delete publishers or packages
Cannot override security policies
All actions logged under own identity

2️⃣ PACKAGES – CONTENT PACKAGE MODEL (BITFLOW ADMIN)
Correct Definition (Authoritative)
A Content Package is an academic bundle of approved subjects, learning units, MCQs, and competencies, curated from publisher-provided content and assigned to colleges by the Bitflow Admin.
🚫 Content Packages are NOT:
Pricing plans
Subscriptions
Payment constructs

Package Ownership & Lifecycle
Stage
Responsibility
Content Creation
Publisher
Subject Availability
Publisher → Bitflow Admin review
Package Creation
Bitflow Admin
Package Assignment
Bitflow Admin
Package Consumption
College / Faculty / Students


Package Creation – Bitflow Admin
A Bitflow Admin can:
Create a content package
Define package metadata:
Package name
Academic scope (e.g., Year / Semester / Discipline)
Status: Draft / Active / Archived
Select approved subjects only
Lock package structure after activation

Package Composition Rules
Each content package may include:
Subjects
Topics under subjects
Learning Units (Books, Videos, Notes)
MCQs
Competency mappings
Restrictions:
Draft or unpublished content cannot be added
Deleted content is automatically excluded
Same content may exist in multiple packages (non-exclusive)

Package Assignment Rules
Packages are assigned to colleges
A college may receive:
One or multiple content packages
Package assignment determines:
What content is visible to faculty
What content can be used in courses
Colleges cannot modify package contents

Package Enforcement
Once assigned:
Faculty can only build courses using package content
Students can only access package-derived content
Removal of a package:
Immediately blocks new access
Does NOT delete historical progress data

3️⃣ SECURITY – BITFLOW ADMIN PORTAL
Authentication & Access Control
Secure login with strong password policy
JWT-based authentication
Role-based access control enforced at API level
Session expiry and forced logout supported

Administrative Security Controls
Bitflow Admin can:
Activate / deactivate publishers
Disable access platform-wide in case of violations
Lock subjects or packages
Prevent content misuse by revoking visibility

Audit & Traceability
All Bitflow Admin actions are logged, including:
Publisher creation / status change
Package creation / modification
Package assignment / removal
Subject approval / restriction
Security overrides
Each audit log includes:
Actor (user ID)
Action performed
Timestamp
Affected entity
Source IP (if enabled)

Data Isolation & Integrity
Bitflow Admin can view cross-tenant data
Cannot modify tenant-owned academic data
No direct database access via UI
All changes pass through validated APIs

Explicit Non-Claims (Important)
The Bitflow Admin portal:
❌ Does not claim enterprise-grade DRM
❌ Does not bypass publisher ownership
❌ Does not impersonate college users
❌ Does not auto-enroll users
Security is governance-focused, not content-consumption-focused.

✅ STATUS OF THIS SECTION
✔️ Conceptually correct
✔️ Aligned with your chats
✔️ Safe for audit & client review
✔️ No subscription / pricing confusion
✔️ Clear separation of responsibilities


