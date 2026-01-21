
📘 Bitflow Medical LMS
PHASE 2 — COMPETENCY FRAMEWORK
(Bitflow-Owned, Centralized & Immutable — Detailed)

1️⃣ Phase Objective & Academic Intent
The purpose of Phase 2 is to establish a uniform academic language across the entire LMS ecosystem.
This phase ensures that:
Every publisher tags content using the same academic vocabulary
Every faculty member plans courses using standardized competencies
Every student’s progress is measured against consistent academic outcomes
Deans and HoDs receive comparable analytics across years, departments, and colleges
In this model, Bitflow is the sole academic authority.

2️⃣ Competency Governance Model (Strict Authority)
2.1 Ownership Rules
Competencies are:
Created only by Bitflow
Maintained centrally
Immutable once published
No downstream stakeholder can:
Edit competency names
Modify descriptions
Change academic intent
2.2 Governance Rationale
This prevents:
Academic dilution
Conflicting interpretations
Publisher-driven bias
Faculty-created inconsistencies

3️⃣ Competency Data Model (System-Level)
Each competency will be stored as a first-class system entity with the following attributes:
3.1 Mandatory Fields
Competency ID (system-generated, unique)
Competency Code (human-readable reference)
Competency Title
Detailed Description
Subject (e.g., Anatomy, Pharmacology)
Domain:
Cognitive
Clinical
Practical
Academic Level (UG / PG / Specialization)
Status:
Active
Deprecated
3.2 Versioning & Deprecation Policy
Competencies cannot be edited after activation
Deprecated competencies:
Remain visible for historical analytics
Are blocked from new tagging
Continue to appear in past course records

4️⃣ Competency Lifecycle Management (Bitflow Only)
4.1 Creation Workflow
Created via Bitflow Owner Portal
Mandatory peer review before activation
Activation locks the competency permanently
4.2 Change Management
Any academic update requires:
Creation of a new competency
Deprecation of the old one
No in-place edits allowed

5️⃣ Competency Usage Across Portals
5.1 Publisher Portal Integration
Publishers can:
Browse Bitflow competency library
Tag learning units with multiple competencies
Use competencies for metadata & analytics
Publishers cannot:
Create custom competencies
Override competency meaning
Hide competency associations

5.2 Faculty Portal Integration
Faculty can:
Select competencies while:
Creating courses
Designing learning flows
Use competencies as:
Course outcome references
Planning indicators
Faculty cannot:
Auto-map competencies
Edit competency definitions
Create local competency variants

5.3 Student Portal Visibility
Students can:
View competencies linked to:
Courses
Learning units
Track progress indicators mapped to completion
⚠️ No grading or AI inference tied to competencies at this stage.

5.4 Dean & HoD Analytics Usage
Deans and HoDs can:
View dashboards grouped by:
Subject
Domain
Academic year
Identify:
Under-covered competencies
Engagement gaps
Curriculum imbalance
❌ No individual student drill-down

6️⃣ Explicit Non-Goals (Hard Exclusions)
Phase 2 explicitly excludes:
Automated competency detection
AI-driven tagging
NLP-based content analysis
Publisher-created competencies
Faculty-created competencies
Student competency submissions
All mappings remain manual and auditable.

7️⃣ Security & Integrity Enforcement
7.1 API Enforcement
Write APIs restricted to Bitflow Owner role only
All read access logged
7.2 Audit Logging
Every action logged:
Competency creation
Activation
Deprecation
Tagging attempts
Unauthorized attempts:
Auto-blocked
Logged for audit review

8️⃣ Phase 2 Completion & Validation Criteria
Phase 2 is approved only if:
Central competency library exists and is frozen
Competencies are immutable post-activation
Publishers can tag learning units correctly
Faculty can select competencies during course creation
Students can view competencies (read-only)
Analytics can group data by competency
No AI or automated logic exists


