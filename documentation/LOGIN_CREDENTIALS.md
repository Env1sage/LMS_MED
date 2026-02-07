# 🔐 Bitflow Medical LMS - Login Credentials

## Quick Access

### For Phase 5 Testing (Faculty Portal):
**Faculty Login:**
- **Email:** `faculty1@aiimsnagpur.edu.in`
- **Password:** `Password123!`
- **Role:** FACULTY
- **College:** AIIMS Nagpur
- **Name:** Dr. Anil Verma

**Student Login (for testing course assignments):**
- **Email:** `aiim002@aiimsnagpur.edu.in` to `aiim030@aiimsnagpur.edu.in`x
- **Password:** `Student@123`
- **Role:** STUDENT
- **College:** AIIMS Nagpur

---

## All System Credentials

### 1️⃣ Bitflow Owner (Super Admin)
- **Email:** `owner@bitflow.com`
- **Password:** `BitflowAdmin@2026`
- **Role:** BITFLOW_OWNER
- **Access:** Full system control, all colleges/publishers

### 2️⃣ College Admin
- **Email:** `admin@aiimsnagpur.edu.in`
- **Password:** `Password123!`
- **Role:** COLLEGE_ADMIN
- **College:** AIIMS Nagpur
- **Access:** Student management, batch operations, college analytics

### 3️⃣ Faculty (Phase 5)
- **Email:** `faculty1@aiimsnagpur.edu.in`
- **Password:** `Password123!`
- **Role:** FACULTY
- **College:** AIIMS Nagpur
- **Name:** Dr. Anil Verma
- **Access:** 
  - Create and publish courses
  - Design learning flows
  - Assign courses to students
  - View student progress analytics

### 4️⃣ Students (Phase 4/5)

**Student 1:**
- **Email:** `rajesh.kumar@student.aiimsnagpur.edu.in`
- **Password:** `Student@123`
- **Name:** Rajesh Kumar
- **Year:** First Year (2024)

**Student 2:**
- **Email:** `priya.sharma@student.aiimsnagpur.edu.in`
- **Password:** `Student@123`
- **Name:** Priya Sharma
- **Year:** First Year (2024)

**Student 3:**
- **Email:** `amit.patel@student.aiimsnagpur.edu.in`
- **Password:** `Student@123`
- **Name:** Amit Patel
- **Year:** First Year (2024)

**Student 4:**
- **Email:** `sneha.reddy@student.aiimsnagpur.edu.in`
- **Password:** `Student@123`
- **Name:** Sneha Reddy
- **Year:** Second Year (2023)

**Student 5:**
- **Email:** `vikram.singh@student.aiimsnagpur.edu.in`
- **Password:** `Student@123`
- **Name:** Vikram Singh
- **Year:** Second Year (2023)

**Additional Students:**
- `ananya.desai@student.aiimsnagpur.edu.in` - Ananya Desai (Second Year)
- `karthik.iyer@student.aiimsnagpur.edu.in` - Karthik Iyer (Third Year)
- `meera.joshi@student.aiimsnagpur.edu.in` - Meera Joshi (Third Year)

**Password for all students:** `Student@123`

**Fallback Students (if Phase 5 seed created them):**
- `student1@aiimsnagpur.edu.in` to `student5@aiimsnagpur.edu.in`
- **Password:** `Student@123`

### 5️⃣ Publisher Admin
- **Email:** `admin@elsevier.com`
- **Password:** `Password123!`
- **Role:** PUBLISHER_ADMIN
- **Publisher:** Elsevier Medical Publishing
- **Access:** Upload learning content, manage learning units

---

## Quick Start Guide

### Testing Phase 5 (Faculty Portal & Learning Flow):

1. **Login as Faculty:**
   ```
   URL: http://localhost:3000/login
   Email: faculty@aiimsnagpur.edu.in
   Password: Faculty@123
   ```

2. **You can:**
   - View existing courses (2 sample courses created)
   - Create new courses
   - Design learning flows with drag-and-drop
   - Assign courses to students
   - View course analytics and student progress

3. **Sample Data Available:**
   - **Course 1:** "Basic Cardiology" (Published)
     - 3 learning steps with mandatory blocking
     - Assigned to first 3 students
   
   - **Course 2:** "Clinical Anatomy Foundations" (Draft)
     - 2 learning steps
     - Not yet assigned

4. **Test Student Login:**
   ```
   Email: rajesh.kumar@student.aiimsnagpur.edu.in
   Password: Student@123
   ```
   - Can view assigned courses
   - Progress tracking (once Phase 6 UI is built)

---

## System URLs

### Frontend (React):
- **URL:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Faculty Dashboard:** http://localhost:3000/faculty

### Backend API (NestJS):
- **URL:** http://localhost:3001
- **API Docs:** http://localhost:3001/api
- **Health:** http://localhost:3001/api

---

## API Testing (Postman/cURL)

### Get Access Token:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "faculty@aiimsnagpur.edu.in",
    "password": "Faculty@123"
  }'
```

Response includes `accessToken` - use in subsequent requests:
```bash
Authorization: Bearer <accessToken>
```

### Test Progress API (as student):
```bash
# Get my courses
curl http://localhost:3001/api/progress/my-courses \
  -H "Authorization: Bearer <student-token>"

# Get course progress
curl http://localhost:3001/api/progress/course/{courseId} \
  -H "Authorization: Bearer <student-token>"

# Check step access
curl http://localhost:3001/api/progress/check-access/{stepId} \
  -H "Authorization: Bearer <student-token>"
```

---

## Database Direct Access

### PostgreSQL:
```bash
psql -U envisage -d bitflow_lms -h localhost

# View all users
SELECT email, role, "fullName" FROM users;

# View faculty courses
SELECT c.id, c.title, c.status, u."fullName" as faculty
FROM courses c
JOIN users u ON c."facultyId" = u.id;

# View course assignments
SELECT 
  c.title as course,
  u."fullName" as student,
  ca.status,
  ca."assignedAt"
FROM course_assignments ca
JOIN courses c ON ca."courseId" = c.id
JOIN users u ON ca."studentId" = u.id;
```

---

## Seed Data Commands

### Run all seeds:
```bash
cd backend

# Phase 0: Base setup (Bitflow owner, colleges, publishers)
npx ts-node prisma/seed.ts

# Phase 2: Competencies
npx ts-node prisma/seed-phase2.ts

# Phase 3: Learning units (content)
npx ts-node prisma/seed-phase3.ts

# Phase 4: College admin and students
npx ts-node prisma/seed-phase4.ts

# Phase 5: Faculty and courses
npx ts-node prisma/seed-phase5.ts
```

---

## Security Notes

⚠️ **These are development/testing credentials only!**

- All passwords are hashed using bcrypt (10-12 rounds)
- Change all credentials before production deployment
- Default passwords follow pattern: `Role@123` or `Role@2026`
- Session timeout: 60 minutes
- Token expiry: 15 minutes
- Refresh token: 30 days
- Max concurrent sessions: 3

---

## Common Issues

### "Invalid credentials"
- Make sure you ran the appropriate seed file
- Check if user exists: `SELECT * FROM users WHERE email = 'faculty@aiimsnagpur.edu.in';`

### "College not found"
- Run Phase 0 seed first: `npx ts-node prisma/seed.ts`
- Then Phase 4: `npx ts-node prisma/seed-phase4.ts`

### "No courses available"
- Run Phase 5 seed: `npx ts-node prisma/seed-phase5.ts`

### Token expired
- Login again to get a fresh token
- Or use the refresh token endpoint: `POST /api/auth/refresh`

---

## Role-Based Access Summary

| Role | Access Level | Key Features |
|------|-------------|--------------|
| **BITFLOW_OWNER** | System-wide | Publishers, colleges, security policies |
| **PUBLISHER_ADMIN** | Publisher-scoped | Upload content, manage learning units |
| **COLLEGE_ADMIN** | College-scoped | Manage students, batch operations |
| **FACULTY** | College-scoped | Create courses, assign to students |
| **STUDENT** | Personal | View assigned courses, track progress |

---

## Support

For issues or questions:
1. Check the seed file logs for actual created users
2. Verify database with direct SQL queries
3. Check backend logs: `cd backend && npm run start:dev`
4. Frontend console for client errors

**Last Updated:** January 10, 2026
**System Version:** Phase 5 Complete
