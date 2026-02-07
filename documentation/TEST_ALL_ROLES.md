# Test All User Roles - Phase 0-5

## ✅ Available Test Users

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| **BITFLOW_OWNER** | owner@bitflow.com | BitflowAdmin@2026 | Full system access |
| **PUBLISHER_ADMIN** | admin@elsevier.com | Password123! | Elsevier admin |
| **COLLEGE_ADMIN** | admin@gmc.edu | Password123! | GMC admin |
| **COLLEGE_ADMIN** | admin@aiimsnagpur.edu.in | Password123! | AIIMS Nagpur admin |
| **FACULTY** | faculty@aiimsnagpur.edu.in | Password123! | Faculty member |
| **STUDENT** | rajesh.kumar@student.aiimsnagpur.edu.in | Password123! | AIIMS student |

## Testing Checklist

### 1. BITFLOW_OWNER Portal (owner@bitflow.com)
Access: http://localhost:3000

**Expected Access:**
- [ ] Login successful
- [ ] See all publishers (Elsevier, Thieme, etc.)
- [ ] See all colleges (GMC, AIIMS, etc.)
- [ ] View system analytics
- [ ] See all competencies
- [ ] View all learning units
- [ ] See all students across colleges
- [ ] View all courses

**Data Transparency Test:**
```bash
# Login as Bitflow Owner
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}' | jq

# Get token and test endpoints
TOKEN="<paste_access_token_here>"

# Should see ALL publishers
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/bitflow-owner/publishers | jq

# Should see ALL colleges
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/bitflow-owner/colleges | jq

# Should see ALL competencies
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/competencies | jq

# Should see ALL learning units
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/learning-units | jq

# Should see ALL students
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/students | jq

# Should see ALL courses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/courses | jq
```

---

### 2. PUBLISHER_ADMIN Portal (admin@elsevier.com)
Access: http://localhost:3000

**Expected Access:**
- [ ] Login successful
- [ ] See only Elsevier's learning units
- [ ] See colleges using Elsevier content
- [ ] Create/edit learning units
- [ ] View usage statistics

**Data Isolation Test:**
```bash
# Login as Publisher Admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elsevier.com","password":"Password123!"}' | jq

TOKEN="<paste_access_token_here>"

# Should see ONLY Elsevier learning units
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/learning-units | jq

# Should NOT access other publishers' data
# Should NOT access Bitflow Owner endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/bitflow-owner/publishers
# Expected: 403 Forbidden

# Should NOT access college admin endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/students
# Expected: 403 Forbidden or filtered data
```

---

### 3. COLLEGE_ADMIN Portal (admin@aiimsnagpur.edu.in)
Access: http://localhost:3000

**Expected Access:**
- [ ] Login successful
- [ ] See only AIIMS Nagpur students
- [ ] See only AIIMS Nagpur courses
- [ ] View available learning units (all publishers)
- [ ] Create/manage students and courses
- [ ] View college-specific analytics

**Data Isolation Test:**
```bash
# Login as College Admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiimsnagpur.edu.in","password":"Password123!"}' | jq

TOKEN="<paste_access_token_here>"

# Should see ONLY AIIMS Nagpur students
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/students | jq

# Should see ONLY AIIMS Nagpur courses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/courses | jq

# Should see ALL learning units (to select for courses)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/learning-units | jq

# Should NOT access other colleges' students
# Should NOT access Bitflow Owner endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/bitflow-owner/publishers
# Expected: 403 Forbidden
```

---

### 4. FACULTY Portal (faculty@aiimsnagpur.edu.in)
Access: http://localhost:3000

**Expected Access:**
- [ ] Login successful
- [ ] See courses they teach
- [ ] See students in their courses
- [ ] Assign learning units to courses
- [ ] View student progress (Phase 6 - not available yet)

**Data Isolation Test:**
```bash
# Login as Faculty
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@aiimsnagpur.edu.in","password":"Password123!"}' | jq

TOKEN="<paste_access_token_here>"

# Should see ONLY their courses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/courses | jq

# Should see students in their courses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/students | jq

# Should NOT access admin endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/bitflow-owner/publishers
# Expected: 403 Forbidden
```

---

### 5. STUDENT Portal (rajesh.kumar@student.aiimsnagpur.edu.in)
Access: http://localhost:3000

**Expected Access:**
- [ ] Login successful
- [ ] See enrolled courses
- [ ] Access learning units
- [ ] View competencies
- [ ] Track progress (Phase 6 - not available yet)

**Data Isolation Test:**
```bash
# Login as Student
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@student.aiimsnagpur.edu.in","password":"Password123!"}' | jq

TOKEN="<paste_access_token_here>"

# Should see ONLY enrolled courses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/courses | jq

# Should see available competencies
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/competencies | jq

# Should NOT access admin endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/students
# Expected: 403 Forbidden or only own record
```

---

## Data Transparency Summary

### Cross-Portal Visibility Requirements

**Bitflow Owner**: 
- ✅ Must see ALL data from ALL portals
- ✅ Publishers, colleges, competencies, learning units, students, courses

**Publisher Admin**:
- ✅ Must see their own learning units
- ✅ Must see colleges using their content
- ❌ Must NOT see other publishers' data
- ❌ Must NOT see student personal data

**College Admin**:
- ✅ Must see their own students and courses
- ✅ Must see ALL learning units (to select for courses)
- ✅ Must see ALL competencies
- ❌ Must NOT see other colleges' students/courses

**Faculty**:
- ✅ Must see courses they teach
- ✅ Must see students in their courses
- ✅ Must see learning units to assign
- ❌ Must NOT see other faculty's courses

**Student**:
- ✅ Must see enrolled courses
- ✅ Must see assigned learning units
- ✅ Must see competencies
- ❌ Must NOT see other students' data

---

## Security Testing

### Authentication Tests
```bash
# Test invalid credentials
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"wrong"}' | jq
# Expected: 401 Unauthorized

# Test invalid token
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3001/api/auth/me | jq
# Expected: 401 Unauthorized

# Test expired token (after 15 minutes)
# Expected: 401 Unauthorized

# Test no token
curl http://localhost:3001/api/students | jq
# Expected: 401 Unauthorized
```

### Authorization Tests
```bash
# Test role escalation - Student trying to access admin endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@student.aiimsnagpur.edu.in","password":"Password123!"}' | jq

TOKEN="<paste_student_token_here>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/bitflow-owner/publishers | jq
# Expected: 403 Forbidden

# Test cross-college access - AIIMS admin trying to access GMC data
# Should be blocked by multi-tenant isolation
```

---

## Quick Test Script

```bash
#!/bin/bash
# Save as: test_all_roles.sh

echo "Testing all user roles..."

# Test Bitflow Owner
echo -e "\n=== BITFLOW OWNER ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:50}..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/bitflow-owner/publishers | jq -r '.[] | .name'

# Test Publisher Admin
echo -e "\n=== PUBLISHER ADMIN ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elsevier.com","password":"Password123!"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:50}..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq

# Test College Admin
echo -e "\n=== COLLEGE ADMIN ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiimsnagpur.edu.in","password":"Password123!"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:50}..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq

# Test Faculty
echo -e "\n=== FACULTY ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@aiimsnagpur.edu.in","password":"Password123!"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:50}..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq

# Test Student
echo -e "\n=== STUDENT ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@student.aiimsnagpur.edu.in","password":"Password123!"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:50}..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq

echo -e "\n=== All roles tested ==="
```

Run with: `bash test_all_roles.sh`

---

## Frontend Testing

1. Open browser: http://localhost:3000
2. Login with: owner@bitflow.com / BitflowAdmin@2026
3. Navigate to Competencies page
4. Verify data loads without "User not authenticated" error
5. Logout and login as different roles
6. Verify each role sees appropriate data

---

## Status

- ✅ Backend: All APIs working (Phase 0-5)
- ✅ Frontend: Running on port 3000
- ✅ Database: Test users available for all roles
- ⚠️ Frontend authentication: Needs browser testing
- ⚠️ Data transparency: Needs verification
- ⚠️ Multi-tenant isolation: Needs testing

**Next**: Test frontend login in browser at http://localhost:3000
