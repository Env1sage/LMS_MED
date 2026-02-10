#!/bin/bash
# Test faculty API endpoints
echo "=== Testing Faculty API ==="

# Login as faculty
RESP=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty5@aiims.edu","password":"Password123!"}')

TOKEN=$(echo "$RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "LOGIN FAILED. Response:"
  echo "$RESP"
  exit 1
fi

echo "Login OK. Token: ${TOKEN:0:20}..."

# Test assignments endpoint
echo ""
echo "--- GET /api/faculty/assignments ---"
curl -s -w "\nHTTP_STATUS:%{http_code}" \
  http://localhost:3001/api/faculty/assignments \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "--- GET /api/faculty/notifications/daily-limit ---"
curl -s -w "\nHTTP_STATUS:%{http_code}" \
  http://localhost:3001/api/faculty/notifications/daily-limit \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "--- GET /api/faculty/notifications/sent ---"
curl -s -w "\nHTTP_STATUS:%{http_code}" \
  http://localhost:3001/api/faculty/notifications/sent \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "--- GET /api/faculty/dashboard (existing) ---"
curl -s -w "\nHTTP_STATUS:%{http_code}" \
  http://localhost:3001/api/faculty/dashboard \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo "=== Tests Complete ==="
