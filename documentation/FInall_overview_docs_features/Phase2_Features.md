
# 🏬 PORTAL 2: PUBLISHER PORTAL

## **FEATURES DOCUMENT** (ONLY FEATURES — NO SECURITY)

> 📄 This section will become **Section A (Features)** of the **Publisher Portal document**.
> 🔐 Security will be a **separate section later**, after feature approval.

---

## 1️⃣ ROLE DEFINITION — PUBLISHER PORTAL

### Role: **PUBLISHER_ADMIN**

#### Purpose

The Publisher Admin is responsible for **academic content creation and maintenance**.
This role supplies the **raw educational material** that powers the entire LMS.

Publishers **do not control colleges or users** and **do not govern the platform**.

---

### Responsibilities (High-Level)

* Create and manage learning content
* Define subjects, topics, and competencies
* Create MCQs and question banks
* Propose content packages (raw content sets)
* Maintain academic quality of content

---

### Explicit Boundaries

The Publisher **CANNOT**:

* Assign content packages to colleges
* Enroll students or faculty
* Create or manage courses
* Access college or student analytics
* Override Bitflow Admin decisions

---

## 2️⃣ CONTENT CREATION & MANAGEMENT

### 2.1 Subject & Topic Creation

Publishers can:

* Create subjects (discipline-level)
* Define subject metadata:

  * Subject name
  * Stream / discipline
  * Academic relevance
* Create topics under subjects
* Bulk import topics (CSV)

Rules:

* Subjects are **proposed**, not final
* Visibility depends on Bitflow Admin approval
* Duplicate subject names are flagged

---

### 2.2 Learning Unit Management

Learning Units represent **atomic academic content**.

Supported types:

* Books (PDF)
* Videos (MP4)
* Notes
* Lectures
* Presentations

Publishers can:

* Upload learning units
* Edit metadata:

  * Subject
  * Topic
  * Difficulty level
  * Academic year relevance
* Publish / unpublish learning units
* Update content versions

Restrictions:

* Unpublished units are invisible outside Publisher portal
* Learning units already used in packages cannot be deleted (only archived)

---

## 3️⃣ MCQ & ASSESSMENT CONTENT

### 3.1 MCQ Creation

Publishers can:

* Create individual MCQs
* Define:

  * Question text
  * Options
  * Correct answer
  * Explanation
* Attach images to questions
* Map MCQs to:

  * Subjects
  * Topics
  * Competencies
* Set difficulty level (K, KH, S, SH, P)

---

### 3.2 Bulk MCQ Operations

* Upload MCQs via CSV
* Validate structure before import
* Reject invalid rows with error feedback
* Edit MCQs post-import

---

### 3.3 MCQ Verification

* Draft → Verified lifecycle
* Verified MCQs are eligible for:

  * Packages
  * Faculty-created tests
* Unverified MCQs remain internal

---

## 4️⃣ COMPETENCY FRAMEWORK MANAGEMENT

Publishers can:

* Create competencies aligned with standards (e.g., MCI)
* Define:

  * Competency codes
  * Descriptions
  * Domain classification
* Map competencies to:

  * Subjects
  * Topics
  * Learning units
  * MCQs

Rules:

* Competency structure must be hierarchical
* Deprecated competencies remain for historical tracking

---

## 5️⃣ CONTENT PACKAGE (PROPOSAL VIEW)

> ⚠️ Important: **Publishers do NOT assign packages to colleges**

### Publisher Scope in Packages

Publishers can:

* Group their own content into **package drafts**
* Define:

  * Academic scope
  * Intended usage (Year / Subject cluster)
* Submit packages for Bitflow Admin review

Publishers cannot:

* Activate packages
* Assign packages to colleges
* Modify packages after approval

---

## 6️⃣ CONTENT ANALYTICS (PUBLISHER VIEW)

Publishers can view **content-level analytics only**:

* Learning unit usage count
* MCQ usage frequency
* Subject popularity
* Topic-level engagement

Restrictions:

* No student identities visible
* No college-level performance metrics
* No individual progress data

---

## 7️⃣ CONTENT VERSIONING & LIFECYCLE

### Supported States

* Draft
* Published
* Archived

Rules:

* Archived content:

  * Not usable in new packages
  * Retained for historical courses
* Edited content creates a new version
* Version history retained internally

---

## 8️⃣ DASHBOARD & NAVIGATION

Publisher Dashboard includes:

* Content count summary
* Subject & topic overview
* MCQ statistics
* Package draft status
* Content health indicators (draft vs published)

---

## 9️⃣ HARD RESTRICTIONS (NON-NEGOTIABLE)

* ❌ No access to student data
* ❌ No access to faculty analytics
* ❌ No course creation
* ❌ No college assignment
* ❌ No platform-level settings

Publisher portal is **content-only**, not operational.

---

## ✅ STATUS OF PUBLISHER PORTAL — FEATURES

✔️ Scope clearly defined
✔️ No package misuse
✔️ Matches prior project chats
✔️ Clean separation from Bitflow Admin
✔️ Ready for security section next

