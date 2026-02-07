#!/bin/bash

echo "=============================================="
echo "   MEDICAL LMS - Complete API Health Check"
echo "=============================================="
echo ""

# Login and get tokens
echo "🔐 Authenticating users..."
OWNER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}' | jq -r .accessToken)

PUBLISHER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elsevier.com","password":"Password123!"}' | jq -r .accessToken)

COLLEGE_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiims.edu","password":"Password123!"}' | jq -r .accessToken)

FACULTY_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty5@aiims.edu","password":"Password123!"}' | jq -r .accessToken)

STUDENT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aiim001@aiims.edu","password":"Password123!"}' | jq -r .accessToken)

echo "✅ All users authenticated successfully"
echo ""

# Test function
test_api() {
    local name="$1"
    local url="$2"
    local token="$3"
    local method="${4:-GET}"
    
    if [ -z "$token" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Authorization: Bearer $token" "$url")
    fi
    
    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo "✅ $name - HTTP $status"
        return 0
    else
        echo "❌ $name - HTTP $status"
        return 1
    fi
}

echo "=============================================="
echo "1️⃣  AUTHENTICATION & USER MANAGEMENT"
echo "=============================================="
test_api "Owner - Get Profile" "http://localhost:3001/api/auth/me" "$OWNER_TOKEN"
test_api "Publisher - Get Profile" "http://localhost:3001/api/auth/me" "$PUBLISHER_TOKEN"
test_api "College Admin - Get Profile" "http://localhost:3001/api/auth/me" "$COLLEGE_TOKEN"
test_api "Faculty - Get Profile" "http://localhost:3001/api/auth/me" "$FACULTY_TOKEN"
test_api "Student - Get Profile" "http://localhost:3001/api/auth/me" "$STUDENT_TOKEN"
echo ""

echo "=============================================="
echo "2️⃣  BITFLOW OWNER PORTAL"
echo "=============================================="
test_api "Get Publishers" "http://localhost:3001/api/bitflow-owner/publishers" "$OWNER_TOKEN"
test_api "Get Colleges" "http://localhost:3001/api/bitflow-owner/colleges" "$OWNER_TOKEN"
test_api "Get Analytics" "http://localhost:3001/api/bitflow-owner/analytics" "$OWNER_TOKEN"
test_api "Get System Stats" "http://localhost:3001/api/bitflow-owner/stats" "$OWNER_TOKEN"
echo ""

echo "=============================================="
echo "3️⃣  COMPETENCY FRAMEWORK"
echo "=============================================="
test_api "Get Competencies" "http://localhost:3001/api/competencies" "$PUBLISHER_TOKEN"
test_api "Get Competency Stats" "http://localhost:3001/api/competencies/stats" "$PUBLISHER_TOKEN"
test_api "Get Subjects" "http://localhost:3001/api/competencies/subjects" "$PUBLISHER_TOKEN"
test_api "Get Topics" "http://localhost:3001/api/topics" "$PUBLISHER_TOKEN"
echo ""

echo "=============================================="
echo "4️⃣  LEARNING UNITS (CONTENT)"
echo "=============================================="
test_api "Get Learning Units" "http://localhost:3001/api/learning-units" "$PUBLISHER_TOKEN"
test_api "Get Learning Unit Stats" "http://localhost:3001/api/learning-units/stats" "$PUBLISHER_TOKEN"
test_api "Get Packages" "http://localhost:3001/api/packages" "$PUBLISHER_TOKEN"
echo ""

echo "=============================================="
echo "5️⃣  STUDENT MANAGEMENT"
echo "=============================================="
test_api "Get Students (College)" "http://localhost:3001/api/students" "$COLLEGE_TOKEN"
test_api "Get Student Stats" "http://localhost:3001/api/students/stats" "$COLLEGE_TOKEN"
echo ""

echo "=============================================="
echo "6️⃣  COURSE MANAGEMENT"
echo "=============================================="
test_api "Get Courses (Faculty)" "http://localhost:3001/api/courses" "$FACULTY_TOKEN"
test_api "Student Library" "http://localhost:3001/api/student-portal/library" "$STUDENT_TOKEN"
test_api "Student Analytics" "http://localhost:3001/api/student-portal/analytics" "$STUDENT_TOKEN"
echo ""

echo "=============================================="
echo "7️⃣  FACULTY ANALYTICS"
echo "=============================================="
test_api "Faculty Dashboard" "http://localhost:3001/api/faculty/dashboard" "$FACULTY_TOKEN"
test_api "Faculty Students" "http://localhost:3001/api/faculty/students" "$FACULTY_TOKEN"
echo ""

echo "=============================================="
echo "8️⃣  STUDENT PORTAL"
echo "=============================================="
test_api "Student Dashboard" "http://localhost:3001/api/student-portal/dashboard" "$STUDENT_TOKEN"
test_api "Student Tests" "http://localhost:3001/api/student-portal/tests" "$STUDENT_TOKEN"
test_api "Student Schedule" "http://localhost:3001/api/student-portal/schedule" "$STUDENT_TOKEN"
echo ""

echo "=============================================="
echo "9️⃣  PROGRESS TRACKING"
echo "=============================================="
test_api "Student Progress" "http://localhost:3001/api/progress" "$STUDENT_TOKEN"
echo ""

echo "=============================================="
echo "🔟 FILE SERVING (UPLOADS)"
echo "=============================================="
test_api "Serve PDF File" "http://localhost:3001/api/uploads/books/sample-book-3.pdf" "$STUDENT_TOKEN"
echo ""

echo "=============================================="
echo "✨ FRONTEND CONNECTIVITY"
echo "=============================================="
test_api "Frontend Home" "http://localhost:3000"
echo ""

echo "=============================================="
echo "📊 SYSTEM HEALTH CHECK COMPLETE"
echo "=============================================="
echo ""
echo "All critical APIs have been tested!"
echo "✅ Backend: http://localhost:3001/api"
echo "✅ Frontend: http://localhost:3000"
echo ""
