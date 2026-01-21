#!/bin/bash
# Comprehensive Phase 0-5 Testing

echo "=================================="
echo "Phase 0-5 Complete System Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local token="$6"
    
    if [ -z "$data" ]; then
        if [ -z "$token" ]; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
        else
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Authorization: Bearer $token" "$url")
        fi
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $HTTP_CODE)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name (Expected $expected_status, got $HTTP_CODE)"
        ((FAILED++))
        return 1
    fi
}

echo "=== PHASE 0: Authentication ==="
echo ""

# Test 1: Login as Bitflow Owner
echo "Testing Bitflow Owner login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}')

OWNER_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$OWNER_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Bitflow Owner login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Bitflow Owner login failed"
    ((FAILED++))
    echo "Response: $LOGIN_RESPONSE"
fi

# Test 2: /auth/me endpoint
if [ -n "$OWNER_TOKEN" ]; then
    ME_RESPONSE=$(curl -s -H "Authorization: Bearer $OWNER_TOKEN" http://localhost:3001/api/auth/me)
    if echo "$ME_RESPONSE" | grep -q "BITFLOW_OWNER"; then
        echo -e "${GREEN}✓${NC} /auth/me returns correct user"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} /auth/me failed"
        ((FAILED++))
    fi
fi

# Test 3: Login as Publisher Admin
echo ""
echo "Testing Publisher Admin login..."
PUBLISHER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elsevier.com","password":"Password123!"}')

PUBLISHER_TOKEN=$(echo "$PUBLISHER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$PUBLISHER_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Publisher Admin login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Publisher Admin login failed"
    ((FAILED++))
fi

# Test 4: Login as College Admin
echo ""
echo "Testing College Admin login..."
COLLEGE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiimsnagpur.edu.in","password":"Password123!"}')

COLLEGE_TOKEN=$(echo "$COLLEGE_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$COLLEGE_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} College Admin login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} College Admin login failed"
    ((FAILED++))
fi

# Test 5: Login as Faculty
echo ""
echo "Testing Faculty login..."
FACULTY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@aiimsnagpur.edu.in","password":"Password123!"}')

FACULTY_TOKEN=$(echo "$FACULTY_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$FACULTY_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Faculty login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Faculty login failed"
    ((FAILED++))
fi

# Test 6: Login as Student
echo ""
echo "Testing Student login..."
STUDENT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@student.aiimsnagpur.edu.in","password":"Password123!"}')

STUDENT_TOKEN=$(echo "$STUDENT_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$STUDENT_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Student login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Student login failed"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 1: Bitflow Owner Portal ==="
echo ""

if [ -n "$OWNER_TOKEN" ]; then
    test_endpoint "GET /bitflow-owner/publishers" "GET" "http://localhost:3001/api/bitflow-owner/publishers" "" "200" "$OWNER_TOKEN"
    test_endpoint "GET /bitflow-owner/colleges" "GET" "http://localhost:3001/api/bitflow-owner/colleges" "" "200" "$OWNER_TOKEN"
    test_endpoint "GET /bitflow-owner/analytics" "GET" "http://localhost:3001/api/bitflow-owner/analytics" "" "200" "$OWNER_TOKEN"
    
    # Test that Publisher Admin is blocked
    if [ -n "$PUBLISHER_TOKEN" ]; then
        test_endpoint "Publisher Admin blocked from /bitflow-owner" "GET" "http://localhost:3001/api/bitflow-owner/publishers" "" "403" "$PUBLISHER_TOKEN"
    fi
fi

echo ""
echo "=== PHASE 2: Competency Framework ==="
echo ""

if [ -n "$OWNER_TOKEN" ]; then
    test_endpoint "GET /competencies/stats" "GET" "http://localhost:3001/api/competencies/stats" "" "200" "$OWNER_TOKEN"
    test_endpoint "GET /competencies/subjects" "GET" "http://localhost:3001/api/competencies/subjects" "" "200" "$OWNER_TOKEN"
    test_endpoint "GET /competencies" "GET" "http://localhost:3001/api/competencies" "" "200" "$OWNER_TOKEN"
fi

echo ""
echo "=== PHASE 3: Learning Units ==="
echo ""

if [ -n "$PUBLISHER_TOKEN" ]; then
    test_endpoint "GET /learning-units/stats" "GET" "http://localhost:3001/api/learning-units/stats" "" "200" "$PUBLISHER_TOKEN"
    test_endpoint "GET /learning-units" "GET" "http://localhost:3001/api/learning-units" "" "200" "$PUBLISHER_TOKEN"
fi

echo ""
echo "=== PHASE 4: Students ==="
echo ""

if [ -n "$COLLEGE_TOKEN" ]; then
    test_endpoint "GET /students/stats" "GET" "http://localhost:3001/api/students/stats" "" "200" "$COLLEGE_TOKEN"
    test_endpoint "GET /students" "GET" "http://localhost:3001/api/students" "" "200" "$COLLEGE_TOKEN"
fi

echo ""
echo "=== PHASE 5: Courses ==="
echo ""

if [ -n "$FACULTY_TOKEN" ]; then
    test_endpoint "GET /courses" "GET" "http://localhost:3001/api/courses" "" "200" "$FACULTY_TOKEN"
fi

echo ""
echo "=== Frontend Connectivity ==="
echo ""

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} Frontend accessible at http://localhost:3000"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Frontend not accessible (HTTP $FRONTEND_STATUS)"
    ((FAILED++))
fi

echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open browser: http://localhost:3000"
    echo "2. Login with: owner@bitflow.com / BitflowAdmin@2026"
    echo "3. Test each portal manually"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the errors above.${NC}"
    exit 1
fi
