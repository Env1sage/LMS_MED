# Medical LMS — Analytics System Explained

## How Analytics Data Flows

### 1. Data Collection (Automatic — No Manual Monitoring Needed)

Everything is tracked automatically by the backend as users interact with the system:

| User Action | What Gets Recorded | Database Table |
|---|---|---|
| Student opens a learning unit | Step progress, time spent, completion % | `student_step_progress` |
| Student submits a test | Score, pass/fail, time taken, answers | `test_attempts` |
| Student is assigned a course | Assignment status (not started → in progress → completed) | `student_progress` |
| Student rates a teacher/course | Rating (1-5), feedback text | `ratings` |
| Faculty creates/publishes a course | Course metadata, learning units, tests | `courses`, `learning_flow_steps` |

**No one needs to "enter" analytics data.** It's all captured from normal usage.

---

### 2. Backend Aggregation (On-Demand Computation)

When the College Admin opens an analytics page, the frontend calls the backend API, which runs SQL queries in real-time:

**Teacher Performance** → calls 2 endpoints:
- `GET /ratings/college/:id/teachers` → averages all student ratings per teacher
- `GET /governance/course-analytics/overview` → gets each course's completion rate, test scores, grouped by faculty name
- The **frontend** then merges these two into an **Effectiveness Score** = 40% rating + 30% completion + 30% test scores

**Student Performance** → calls 1 endpoint:
- `GET /students/performance-analytics` → the backend queries `student_progress`, `test_attempts`, and `student_step_progress` tables, computes per-student:
  - **Score** = 60% avg test score + 40% completion rate
  - Groups into top performers (≥80), need attention (<60)
  - Groups by academic year

**Course Analysis** → calls 3 endpoints:
- `GET /governance/course-analytics/overview` → per-course: enrolled, completed, in-progress, not-started counts, completion %, avg test score, pass rate
- `GET /governance/course-analytics/course-comparison` → side-by-side with avg time spent
- `GET /governance/course-analytics/course-details?courseId=X` → drill-down: every student's progress, every test attempt, learning units, competencies

---

### 3. Who Sees What (Role-Based Access)

```
┌──────────────────┐
│   COLLEGE ADMIN  │ ← Sees ALL teachers, ALL students, ALL courses in their college
│                  │   (filtered automatically by collegeId from JWT token)
├──────────────────┤
│     FACULTY      │ ← Sees only THEIR OWN courses and students assigned to them
│                  │   (filtered by userId from JWT token)
├──────────────────┤
│     STUDENT      │ ← Sees only THEIR OWN progress and scores
│                  │   (filtered by userId from JWT token)
└──────────────────┘
```

The backend enforces this — every API call extracts the user's `collegeId` and `role` from the JWT token. A faculty member can never see another faculty's data.

---

### 4. Visual Flow for College Admin

```
College Admin logs in
        │
        ▼
   Dashboard ──→ Quick summary (5 stat cards, top 5 courses)
        │
        ├──→ Teacher Performance ──→ All faculty ranked by effectiveness
        │         │                   Click to expand → rating distribution + student feedback
        │
        ├──→ Student Performance ──→ Year-wise overview cards + bar chart
        │         │                   Tabs: Top Performers | Need Attention | All Students
        │         │                   Filter by year, department, search by name
        │
        └──→ Course Analysis ──→ Overview table (all courses with metrics)
                  │                Comparison tab (side-by-side horizontal bars)
                  │                Click "View" → deep drill-down:
                  │                   └─ Students tab (per-student progress)
                  │                   └─ Tests tab (per-test scores + individual attempts)
                  │                   └─ Learning Units (step listing)
                  │                   └─ Competencies (MCI codes linked)
```

---

### 5. Backend Endpoints Summary

#### Course Analytics Controller (`/governance/course-analytics`)
| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/overview` | COLLEGE_ADMIN, FACULTY | Per-course stats with summary |
| GET | `/course-comparison` | COLLEGE_ADMIN, FACULTY, DEAN | Side-by-side comparison |
| GET | `/course-details` | COLLEGE_ADMIN, FACULTY | Deep drill-down per course |

#### Students Controller (`/students`)
| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/stats` | COLLEGE_ADMIN, FACULTY, DEAN | Count breakdown by status/year |
| GET | `/performance-analytics` | COLLEGE_ADMIN, FACULTY, DEAN | Full performance data with rankings |

#### Ratings Controller (`/ratings`)
| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/college/:id/courses` | COLLEGE_ADMIN, FACULTY, DEAN | Per-course ratings |
| GET | `/college/:id/teachers` | COLLEGE_ADMIN, FACULTY, DEAN | Per-teacher ratings |
| GET | `/entity/:type/:id` | Any authenticated | Rating distribution + feedback |
| GET | `/analytics/global` | BITFLOW_OWNER | Platform-wide rating stats |

#### Faculty Analytics Controller (`/faculty`)
| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/dashboard` | FACULTY | Faculty overview with all courses |
| GET | `/courses/:id/analytics` | FACULTY | Course-specific analytics |
| GET | `/courses/:id/batch-summary` | FACULTY | Dept/year grouped completion |
| GET | `/courses/:id/mcq-analytics` | FACULTY | MCQ performance breakdown |
| GET | `/courses/:id/students/:sid` | FACULTY | Individual student progress |
| GET | `/courses/:id/report` | FACULTY | Report JSON |
| GET | `/courses/:id/report/csv` | FACULTY | CSV file download |
| GET | `/students` | FACULTY | All enrolled students |

---

### In Short

**Nobody manually enters analytics.** The system automatically tracks every student action (opening content, submitting tests, completing steps). When any admin opens an analytics page, the backend runs real-time queries across these tracking tables, aggregates the numbers, and the frontend displays them with visual bars, scores, and rankings. Each role only sees data scoped to their own college/courses/self via JWT-based filtering.
