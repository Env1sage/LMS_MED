# Phase 4 Testing Guide
## College Admin Portal & Student Identity Management

### 🚀 System Status
- **Backend**: http://localhost:3001/api (Running ✅)
- **Frontend**: http://localhost:3000 (Running ✅)
- **Database**: PostgreSQL with Phase 4 schema applied ✅

---

## 🔐 Test Credentials

### College Administrator
- **Email**: `admin@aiimsnagpur.edu.in`
- **Password**: `Admin@123`
- **Role**: COLLEGE_ADMIN
- **College**: Grant Medical College Mumbai

### Sample Students (8 Total)

#### Active Students (5)
1. **Rajesh Kumar** - 2nd Year
   - Email: `rajesh.kumar@student.aiimsnagpur.edu.in`
   - Password: `5n58z3evA1!`

2. **Priya Sharma** - 1st Year
   - Email: `priya.sharma@student.aiimsnagpur.edu.in`
   - Password: `d5157bd9A1!`

3. **Amit Patel** - 3rd Year
   - Email: `amit.patel@student.aiimsnagpur.edu.in`
   - Password: `wfp1yr58A1!`

4. **Sneha Reddy** - 4th Year
   - Email: `sneha.reddy@student.aiimsnagpur.edu.in`
   - Password: `kuuhqcsnA1!`

5. **Vikram Singh** - Internship
   - Email: `vikram.singh@student.aiimsnagpur.edu.in`
   - Password: `tcg6bxsqA1!`

#### Inactive Student (1)
6. **Ananya Desai** - 2nd Year (INACTIVE)
   - Email: `ananya.desai@student.aiimsnagpur.edu.in`
   - Password: `7c1hj9bwA1!`

#### Graduated Student (1)
7. **Karthik Iyer** - Internship (GRADUATED)
   - Email: `karthik.iyer@student.aiimsnagpur.edu.in`
   - Password: `3bmw5gi3A1!`

#### Dropped Out Student (1)
8. **Meera Joshi** - 2nd Year (DROPPED_OUT)
   - Email: `meera.joshi@student.aiimsnagpur.edu.in`
   - Password: `n2a5see7A1!`

---

## 📊 Current Statistics
- **Total Students**: 8
- **Active**: 5
- **Inactive**: 1
- **Graduated**: 1
- **Dropped Out**: 1

### Distribution by Academic Year
- **1st Year**: 1 student
- **2nd Year**: 3 students
- **3rd Year**: 1 student
- **4th Year**: 1 student
- **Internship**: 2 students

---

## 🧪 Testing Scenarios

### 1. College Admin Login
**Steps:**
1. Navigate to http://localhost:3000/login
2. Enter: `admin@aiimsnagpur.edu.in` / `Admin@123`
3. Click Login
4. Should redirect to `/college-admin` dashboard

**Expected:**
- Successful login with JWT token
- Access to College Admin Dashboard
- View 3 tabs: Overview, Students, Bulk Actions

---

### 2. View Student Statistics
**Steps:**
1. Login as College Admin
2. Navigate to Overview tab
3. View statistics cards

**Expected:**
- Total students: 8
- Active: 5, Inactive: 1, Graduated: 1, Dropped Out: 1
- Year distribution grid showing all academic years
- Visual cards with status breakdown

---

### 3. View Student List
**Steps:**
1. Login as College Admin
2. Navigate to Students tab
3. View the students table

**Expected:**
- 8 students displayed in table
- Columns: Name, Email, Academic Year, Status, Actions
- Status badges color-coded (green=active, red=inactive, blue=graduated, gray=dropped)
- Action buttons visible for each student

---

### 4. Filter Students
**Steps:**
1. On Students tab
2. Use status dropdown to filter by "ACTIVE"
3. Use academic year dropdown to filter by "SECOND_YEAR"
4. Use search box to search "Rajesh"

**Expected:**
- Status filter: Shows only 5 active students
- Year filter: Shows only 3 second-year students
- Search: Shows only matching student(s)
- Filters can be combined

---

### 5. Create New Student
**Steps:**
1. Click "Create Student" button on dashboard
2. Navigate to `/college-admin/create-student`
3. Fill form:
   - Full Name: Test Student
   - Email: test.student@student.aiimsnagpur.edu.in
   - Year of Admission: 2024
   - Expected Passing Year: 2029
   - Academic Year: FIRST_YEAR
4. Click "Generate Random Password" button
5. Note the generated password
6. Click "Create Student"

**Expected:**
- Form validation works
- Password generated successfully
- Alert shows temporary password
- Student created in database
- Redirected back to dashboard
- New student appears in table

---

### 6. Activate/Deactivate Student
**Steps:**
1. On Students tab, find "Ananya Desai" (INACTIVE)
2. Click "Activate" button
3. Confirm action
4. Find "Rajesh Kumar" (ACTIVE)
5. Click "Deactivate" button
6. Confirm action

**Expected:**
- Ananya's status changes to ACTIVE (green badge)
- Ananya's user account becomes active
- Rajesh's status changes to INACTIVE (red badge)
- Rajesh's user account deactivated
- All Rajesh's sessions invalidated (he gets logged out if logged in)
- Success message displayed
- Statistics updated

---

### 7. Edit Student Information
**Steps:**
1. On Students tab, find any student
2. Click "Edit" button
3. Modify student information (e.g., change academic year)
4. Save changes

**Expected:**
- Edit modal/page opens
- Current values pre-filled
- Validation works
- Changes saved successfully
- Student info updated in table
- Audit log created

---

### 8. Reset Student Credentials
**Steps:**
1. On Students tab, find any active student
2. Click "Reset Password" button
3. Enter new password
4. Confirm action

**Expected:**
- Password reset successfully
- New password hashed and stored
- All student's sessions invalidated
- All refresh tokens revoked
- Student must login again with new password
- Audit log created for credentials reset

---

### 9. Bulk Promote Students
**Steps:**
1. On Students tab, select multiple students (checkboxes)
2. Navigate to Bulk Actions tab
3. View selected count
4. Click "Bulk Promote" button
5. Select new academic year (e.g., THIRD_YEAR)
6. Confirm action

**Expected:**
- Shows number of selected students
- Promotion successful
- All selected students' academic year updated
- Success message with count
- Statistics updated
- Audit log created with count
- Table refreshed automatically

---

### 10. Student Login Attempt
**Steps:**
1. Logout as admin
2. Try to login as "Rajesh Kumar" (active student)
3. Navigate to `/college-admin`

**Expected:**
- Student can login successfully
- JWT token issued
- Access DENIED to `/college-admin` route (403 Forbidden)
- Redirected to appropriate student page (when implemented in Phase 5+)

---

### 11. College Isolation Test
**Steps:**
1. Create another college admin for different college (via API/seed)
2. Login as that admin
3. Try to view students

**Expected:**
- Admin can only see students from their own college
- Cannot access/modify students from other colleges
- College ID scoped in all queries

---

### 12. Graduation Workflow Test
**Steps:**
1. Find "Karthik Iyer" (GRADUATED status)
2. Attempt to activate/deactivate
3. Check if editable

**Expected:**
- Graduated students should have limited edit options
- May be read-only or have special handling
- Status badge shows GRADUATED (blue)

---

## 🔌 API Endpoint Testing

### Test with cURL

#### 1. Login as Admin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiimsnagpur.edu.in","password":"Admin@123"}'
```

#### 2. Get Statistics (with token)
```bash
TOKEN="your_token_here"
curl -X GET http://localhost:3001/api/students/stats \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. List All Students
```bash
curl -X GET "http://localhost:3001/api/students?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### 4. Filter Active Students
```bash
curl -X GET "http://localhost:3001/api/students?status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"
```

#### 5. Create Student
```bash
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fullName": "New Student",
    "email": "new.student@student.aiimsnagpur.edu.in",
    "yearOfAdmission": 2024,
    "expectedPassingYear": 2029,
    "currentAcademicYear": "FIRST_YEAR"
  }'
```

#### 6. Get Single Student
```bash
curl -X GET http://localhost:3001/api/students/{studentId} \
  -H "Authorization: Bearer $TOKEN"
```

#### 7. Update Student
```bash
curl -X PATCH http://localhost:3001/api/students/{studentId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currentAcademicYear": "SECOND_YEAR"
  }'
```

#### 8. Activate Student
```bash
curl -X PATCH http://localhost:3001/api/students/{studentId}/activate \
  -H "Authorization: Bearer $TOKEN"
```

#### 9. Deactivate Student
```bash
curl -X PATCH http://localhost:3001/api/students/{studentId}/deactivate \
  -H "Authorization: Bearer $TOKEN"
```

#### 10. Bulk Promote
```bash
curl -X POST http://localhost:3001/api/students/bulk-promote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "studentIds": ["id1", "id2", "id3"],
    "newAcademicYear": "THIRD_YEAR"
  }'
```

#### 11. Reset Credentials
```bash
curl -X POST http://localhost:3001/api/students/{studentId}/reset-credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "newPassword": "NewPassword@123"
  }'
```

---

## ✅ Validation Checklist

### Backend Validation
- [ ] All 9 student endpoints responding
- [ ] Role-based access control working (COLLEGE_ADMIN only)
- [ ] College isolation enforced
- [ ] Password generation works
- [ ] Session invalidation on deactivate
- [ ] Token invalidation on credentials reset
- [ ] Bulk operations work correctly
- [ ] Pagination working
- [ ] Filters work (status, year, search)
- [ ] Statistics accurate
- [ ] Audit logs created for all actions

### Frontend Validation
- [ ] College Admin Dashboard loads
- [ ] Statistics cards display correctly
- [ ] Year distribution grid shows all years
- [ ] Students table renders with data
- [ ] Filters work (status, year, search)
- [ ] Create student form validates
- [ ] Password generation works
- [ ] Activate/Deactivate buttons work
- [ ] Edit functionality works
- [ ] Reset password works
- [ ] Bulk selection works (checkboxes)
- [ ] Bulk promote works
- [ ] Success/error messages display
- [ ] Loading states work
- [ ] Responsive design on mobile
- [ ] Navigation works
- [ ] Logout works

### Security Validation
- [ ] Students cannot access admin routes
- [ ] JWTs validated on all endpoints
- [ ] Passwords hashed (bcrypt)
- [ ] Temporary passwords secure (12+ chars)
- [ ] Sessions invalidated properly
- [ ] Refresh tokens revoked properly
- [ ] College isolation cannot be bypassed
- [ ] SQL injection prevented (Prisma)
- [ ] XSS prevented (React escaping)

### Data Integrity
- [ ] User and Student created in transaction
- [ ] Cascade deletes work (college → students)
- [ ] Status consistency (Student.status ↔ User.status)
- [ ] Year validation (passing > admission)
- [ ] Unique constraints enforced (email, userId)
- [ ] Audit logs immutable
- [ ] Timestamps accurate

---

## 🐛 Known Issues / Edge Cases

### To Test
1. What happens if admin tries to create student with existing email?
2. What happens if admin deactivates themselves?
3. Can graduated students login?
4. What happens on bulk promote with invalid year?
5. Password reset validation (min length, complexity)?
6. Search case sensitivity?
7. Pagination with large datasets?
8. Concurrent updates to same student?

---

## 📝 Next Steps (Phase 5+)

- Student portal UI
- Student learning unit access
- Student progress tracking
- Student performance analytics
- Student notifications
- Student profile management
- Academic calendar integration
- Attendance tracking

---

## 🔗 Related Documentation

- [Phase 4 Requirements](./phase4.md)
- [Phase 3 Completion](./phase3-completion.md)
- [API Documentation](./api-docs.md)
- [Database Schema](../backend/prisma/schema.prisma)

---

**Last Updated**: 10 January 2026
**Phase Status**: ✅ Complete & Ready for Testing
