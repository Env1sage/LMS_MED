#!/bin/bash
# Test all user roles

echo "==============================================="
echo "Testing All User Roles - Phase 0-5"
echo "==============================================="

# Test Bitflow Owner
echo -e "\n🔑 Testing BITFLOW_OWNER (owner@bitflow.com)..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
  echo "📋 User info:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq -c
  echo "📊 Publishers access:"
  PUBS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/bitflow-owner/publishers | jq -r 'length')
  echo "   Can see $PUBS publishers"
  echo "🏫 Colleges access:"
  COLS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/bitflow-owner/colleges | jq -r 'length')
  echo "   Can see $COLS colleges"
else
  echo "❌ Login failed"
fi

# Test Publisher Admin
echo -e "\n🔑 Testing PUBLISHER_ADMIN (admin@elsevier.com)..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elsevier.com","password":"Password123!"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
  echo "📋 User info:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq -c
  echo "📚 Learning units access:"
  LU=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/learning-units | jq -r '.data | length')
  echo "   Can see $LU learning units"
  echo "🚫 Testing restricted access (should fail):"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/bitflow-owner/publishers)
  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Correctly blocked from Bitflow Owner endpoints ($HTTP_CODE)"
  else
    echo "   ⚠️  WARNING: Got $HTTP_CODE (expected 403)"
  fi
else
  echo "❌ Login failed"
fi

# Test College Admin
echo -e "\n🔑 Testing COLLEGE_ADMIN (admin@aiimsnagpur.edu.in)..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiimsnagpur.edu.in","password":"Password123!"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
  echo "📋 User info:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq -c
  echo "👨‍🎓 Students access:"
  STU=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/students | jq -r '.data | length')
  echo "   Can see $STU students"
  echo "📖 Courses access:"
  CRS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/courses | jq -r '.data | length')
  echo "   Can see $CRS courses"
else
  echo "❌ Login failed"
fi

# Test Faculty
echo -e "\n🔑 Testing FACULTY (faculty@aiimsnagpur.edu.in)..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@aiimsnagpur.edu.in","password":"Password123!"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
  echo "📋 User info:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq -c
  echo "📖 Courses access:"
  CRS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/courses | jq -r '.data | length')
  echo "   Can see $CRS courses"
else
  echo "❌ Login failed"
fi

# Test Student
echo -e "\n🔑 Testing STUDENT (rajesh.kumar@student.aiimsnagpur.edu.in)..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@student.aiimsnagpur.edu.in","password":"Password123!"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
  echo "📋 User info:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | jq -c
  echo "🎯 Competencies access:"
  COMP=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/competencies | jq -r '.data | length')
  echo "   Can see $COMP competencies"
  echo "🚫 Testing restricted access (should fail):"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/bitflow-owner/publishers)
  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Correctly blocked from admin endpoints ($HTTP_CODE)"
  else
    echo "   ⚠️  WARNING: Got $HTTP_CODE (expected 403)"
  fi
else
  echo "❌ Login failed"
fi

echo -e "\n==============================================="
echo "✅ All role tests completed!"
echo "==============================================="
echo ""
echo "Next steps:"
echo "1. Open browser: http://localhost:3000"
echo "2. Test frontend login with each role"
echo "3. Verify data transparency across portals"
echo ""
