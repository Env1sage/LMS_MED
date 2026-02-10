#!/bin/bash
# Faculty API Endpoint Test Script

BASE="http://localhost:3001/api"

echo "========================================"
echo "STEP 1: Login as faculty5@aiims.edu"
echo "========================================"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty5@aiims.edu","password":"Password123!"}')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | head -c 1500
echo ""
echo ""

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//;s/"//')

if [ -z "$TOKEN" ]; then
  echo "========================================"
  echo "Login failed with faculty5@aiims.edu, trying faculty11@manipal.edu..."
  echo "========================================"
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"faculty11@manipal.edu","password":"Password123!"}')
  
  echo "Login Response:"
  echo "$LOGIN_RESPONSE" | head -c 1500
  echo ""
  echo ""
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//;s/"//')
fi

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not obtain JWT token from either account!"
  exit 1
fi

echo "TOKEN obtained (first 50 chars): ${TOKEN:0:50}..."
echo ""

# Test each endpoint
ENDPOINTS=(
  "faculty/dashboard"
  "faculty/assignments"
  "faculty/notifications/daily-limit"
  "faculty/notifications/sent"
  "governance/notifications/my-notifications"
  "governance/notifications/unread-count"
)

for EP in "${ENDPOINTS[@]}"; do
  echo "========================================"
  echo "Testing: GET /api/$EP"
  echo "========================================"
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE/$EP" \
    -H "Authorization: Bearer $TOKEN")
  echo "HTTP Status: $STATUS"
  
  BODY=$(curl -s -X GET "$BASE/$EP" \
    -H "Authorization: Bearer $TOKEN" | head -c 500)
  echo "Response Body:"
  echo "$BODY"
  echo ""
  echo ""
done

echo "========================================"
echo "ALL TESTS COMPLETE"
echo "========================================"
