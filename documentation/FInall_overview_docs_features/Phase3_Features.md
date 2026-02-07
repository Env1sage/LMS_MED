
# 🏫 PORTAL 3: COLLEGE ADMIN PORTAL

## **FEATURES DOCUMENT** (ONLY FEATURES — NO SECURITY)

> 📄 This becomes **Section A (Features)** of the **College Admin Portal document**.
> 🔐 Security will be added **only after your approval**.

---

## 1️⃣ ROLE DEFINITION — COLLEGE ADMIN PORTAL

### Role: **COLLEGE_ADMIN**

#### Purpose

The College Admin is responsible for **institution-level operations** inside the LMS.

This role acts as the **bridge between content (packages) and academic delivery**, but **does not create core content**.

---

### Responsibilities (High-Level)

* Manage college structure
* Manage faculty and students
* Assign content packages received from Bitflow Admin
* Oversee academic progress and analytics
* Ensure correct academic mapping (departments, years, batches)

---

### Explicit Boundaries

The College Admin **CANNOT**:

* Create or edit publisher content
* Modify content packages
* Access other colleges’ data
* Access platform-level (Bitflow Owner) controls

---

## 2️⃣ COLLEGE PROFILE & STRUCTURE MANAGEMENT

### 2.1 College Profile

College Admin can:

* View college profile
* Update basic details:

  * College name
  * Address
  * Contact information
* View assigned content packages

Restrictions:

* Cannot change college identity (ID)
* Cannot self-upgrade permissions

---

### 2.2 Department Management

College Admin can:

* Create departments
* Edit department details
* Activate / deactivate departments
* Assign HODs to departments
* View department-wise statistics

Rules:

* Departments are college-scoped
* A department must exist before faculty or students are added
* Deactivated departments cannot accept new users

---

## 3️⃣ FACULTY MANAGEMENT

### 3.1 Faculty User Management

College Admin can:

* Create faculty accounts
* Edit faculty profiles
* Activate / deactivate faculty
* Assign faculty to departments
* Assign academic roles (Faculty / HOD)

Restrictions:

* Cannot create Publisher or Admin roles
* Cannot modify faculty content ownership
* Cannot view faculty private credentials

---

### 3.2 Faculty Academic Mapping

College Admin can:

* Assign faculty to subjects
* Control teaching scope (department, year)
* View faculty workload overview

---

## 4️⃣ STUDENT MANAGEMENT

### 4.1 Student User Management

College Admin can:

* Create student accounts (individual)
* Bulk upload students via CSV
* Edit student profiles
* Activate / deactivate students
* Assign students to:

  * Departments
  * Academic years
  * Batches

---

### 4.2 Academic Progression

College Admin can:

* Promote students to next academic year
* Bulk promote students
* View student enrollment history

Rules:

* Promotion does not delete historical data
* Deactivated students retain past progress records

---

## 5️⃣ CONTENT PACKAGE CONSUMPTION

> ⚠️ College Admin **consumes**, but does not control, packages

### 5.1 Package Visibility

College Admin can:

* View all content packages assigned to the college
* View package composition:

  * Subjects
  * Topics
  * Learning units
  * MCQs

Restrictions:

* Cannot modify package contents
* Cannot add/remove subjects from packages

---

### 5.2 Package Usage Control

College Admin controls:

* Which packages are active for the college
* Which departments can use which packages
* Academic year applicability (if applicable)

---

## 6️⃣ COURSE GOVERNANCE (OVERSIGHT LEVEL)

> ⚠️ College Admin does **not** create courses

College Admin can:

* View all courses created by faculty
* Monitor course status (Draft / Published)
* View enrollment counts
* Disable courses if required (administrative override)

Restrictions:

* Cannot edit course content or learning flow
* Cannot modify faculty-created assessments

---

## 7️⃣ ANALYTICS & DASHBOARD (COLLEGE VIEW)

### 7.1 Dashboard Overview

College Admin dashboard includes:

* Total students
* Total faculty
* Departments count
* Active courses
* Overall completion rate

---

### 7.2 Academic Analytics

College Admin can view:

* Course-wise performance
* Course comparison metrics
* Department-wise progress
* Student performance distribution:

  * Top performers
  * Students needing attention
* Academic year-based filtering

---

## 8️⃣ NOTIFICATIONS & COMMUNICATION

College Admin can:

* Create college-wide announcements
* Send department-level notifications
* View notification history

Restrictions:

* Cannot message individual students privately (if restricted)
* Cannot send platform-wide notifications

---

## 9️⃣ REPORTING & EXPORTS

College Admin can:

* Export:

  * Student lists
  * Course performance reports
  * Analytics summaries
* Download reports in CSV format

---

## 🔟 HARD RESTRICTIONS (NON-NEGOTIABLE)

* ❌ No content creation
* ❌ No package modification
* ❌ No platform governance
* ❌ No access to other colleges’ data
* ❌ No system security controls

---

## ✅ STATUS — COLLEGE ADMIN PORTAL (FEATURES)

✔️ Clear operational scope
✔️ Proper separation from Publisher & Admin
✔️ Correct package consumption model
✔️ Aligned with project discussions
✔️ Ready for security section

---