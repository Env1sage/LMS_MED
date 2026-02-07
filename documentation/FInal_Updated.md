

# 📘 BITFLOW LMS

## Phase-wise & Portal-wise Functional Specification

*(CBME / Competency-Based Medical Education Aligned)*

---

# 🔹 PHASE 0 – FOUNDATION & CORE SYSTEM SETUP

## 0.1 CBME MASTER DATA INGESTION (SYSTEM LEVEL)

### Objective

Create a **single source of truth** for medical education structure as per CBME.

### Source

* UG Curriculum Vol I, II, III (MCI/NMC)

### Data Structure (Locked)

```
Subject
 └── Topic
      └── Competency
           ├── Competency Code
           ├── Domain (K / S / A / C)
           ├── Level (K / KH / SH / P)
           ├── Core / Non-Core
           └── Derived Learning Objectives
```

### Rules

* Editable ❌
* Searchable ✅
* Used across all portals
* Publishers cannot create or modify competencies

---

## 0.2 GLOBAL DESIGN RULES

* Delete button available **everywhere**
* Filters & sorting on **every list**
* Role-based visibility
* No notifications module
* Hover + cursor interactions
* Fully dropdown/search driven (no free typing for academic data)

---

# 🔹 PHASE 1 – BITFLOW OWNER PORTAL

## 1.1 Dashboard (Global Analytics)

### Features

* Total publishers
* Total colleges
* Total users (role-wise)
* Content distribution
* Active vs expired contracts
* Activity logs (upload, assign, update)

---

## 1.2 Publishers Management

### 1.2.1 Publishers List Page

**Columns**

* Publisher Name
* Contract Start / End
* Contract Expiry Status
* Total Books
* Total MCQs
* Total Videos
* Status
* Actions: View | Edit | Delete

**Filters**

* Publication-wise
* Contract expiry
* Status
* Alphabetical

---

### 1.2.2 Add / Edit Publisher

**Fields**

* Company Name
* Contact Person
* Email (Login)
* Password (Auto / Manual)
* Phone
* Address
* Contract Duration
* Agreement Upload (PDF/DOC)
* Status

**Automation**

* Credential email sent
* Agreement shared with publisher

---

### 1.2.3 Publisher Detail Page

* Company details
* Contract info
* Agreement view/download
* Content analytics
* Activity log

---

## 1.3 College Management

### 1.3.1 College List

* College Name
* Contract Expiry
* Assigned Packages
* Max Users Allowed
* Active Users Count
* Status
* Actions

**Filters**

* College-wise
* Package-wise
* Status

---

### 1.3.2 Add / Edit College

**College Details**

* Name
* Address
* Contract Duration
* Agreement Upload

**Account Controls**

* Maximum accounts (includes all roles)

**Admin Creation**

* Principal (Admin)
* IT Admin (Admin)

  * Same access
  * Separate credentials

**Automation**

* Credentials auto emailed
* Security info shared

---

## 1.4 Package Creation & Assignment

### 1.4.1 Package Creation (Bitflow Owner Only)

**Package Contains**

* Books / Notes / MCQs / Videos
* Subject-wise
* Year-wise
* Publisher content

**Rules**

* Dynamic packages
* Content update reflects everywhere

---

### 1.4.2 Assign Package to College

* Select package
* Validity
* Editable anytime

---

# 🔹 PHASE 2 – PUBLISHER PORTAL

## 2.1 Publisher Dashboard

* Content usage
* College distribution
* MCQ engagement

---

## 2.2 Content Upload (CORE FLOW)

### Step 1 – Academic Context

* Year

  * 1
  * 2
  * 3 Minor
  * 3 Major
  * Internship
* Subject (CBME dropdown)

---

### Step 2 – 🔍 Topic Search (MANDATORY)

* Search bar (example: “Thorax”)
* Fetches topics from CBME repository
* No manual entry allowed

---

### Step 3 – Competency Auto-Load

Once topic selected:

* System loads all mapped competencies
* Shows:

  * Code
  * Description
  * Domain
  * Level

---

### Step 4 – Mandatory Competency Mapping

Rules:

* At least 1 competency required
* Cannot publish without mapping
* Same logic for:

  * Books
  * Notes
  * Videos
  * MCQs

---

### Step 5 – Learning Objectives (AUTO)

* Difficulty field ❌ removed
* Learning objectives auto-derived
* Publisher can view only

---

## 2.3 MCQ Module

### MCQ Types

1. Normal MCQ
2. Scenario-based MCQ
3. Image-based MCQ

### MCQ Creation Fields

* Subject
* Year
* Topic (search)
* Competency (mandatory)
* Learning objective (auto)
* MCQ type
* Question
* Options
* Answer
* Explanation

---

### Bulk MCQ Upload

**Mandatory Columns**

* Subject
* Year
* Topic
* Competency Code
* MCQ Type
* Question
* Options
* Correct Answer

**Validation**

* Topic-competency mismatch → fail
* Invalid competency → fail

---

# 🔹 PHASE 3 – COLLEGE PORTAL

## 3.1 Roles

* Principal (Admin)
* IT Admin
* Dean

---

## 3.2 Admin Capabilities

### IT Admin

* Add faculty
* Add students
* Bulk user upload
* Auto credential email

### Dean

* Academic analytics
* Department overview

---

## 3.3 Security Display

* Encrypted credentials
* Role-based access
* No offline access
* Audit tracking

---

# 🔹 PHASE 4 – FACULTY PORTAL

## 4.1 Teacher

### Features

* Subject analytics
* Student performance filtering
* MCQ preview before publish
* Upload:

  * Notes
  * PPT
  * Assignments
* Assign students based on slabs

---

## 4.2 HOD

* Department analytics
* Teacher performance overview

---

# 🔹 PHASE 5 – STUDENT PORTAL

## 5.1 My Library

* E-Books
* MCQs
* Video lectures

---

## 5.2 Learning & Analytics

* Competency-wise performance
* Subject analytics
* Self-paced learning
* Faculty-assigned content

---

# 🔹 PHASE 6 – UI / UX & INTERACTION LAYER

## Global UX Rules

* Hover states
* Cursor micro-interactions
* Sticky filters
* Skeleton loaders
* Smart empty states
* Consistent delete/edit actions
* Minimal clicks

---

# ✅ FINAL CONFIRMATION

This document now:

✔ Fully satisfies **every requirement you gave**
✔ Strictly follows **CBME PDFs**
✔ Implements **topic → competency search correctly**
✔ Enforces **mandatory competency mapping**
✔ Is **audit-safe, scalable, and production-ready**


