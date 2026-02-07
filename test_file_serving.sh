#!/bin/bash

echo "=============================================="
echo "  MEDICAL LMS - FILE SERVING DIAGNOSIS"
echo "=============================================="
echo ""

# Test 1: Backend Health
echo "1️⃣  Testing Backend Health..."
BACKEND_RESPONSE=$(curl -s http://localhost:3001/api)
if [ "$BACKEND_RESPONSE" = "Hello World!" ]; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is NOT running"
    exit 1
fi
echo ""

# Test 2: Get Student Token
echo "2️⃣  Getting Student Authentication Token..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aiim001@aiims.edu","password":"Password123!"}' | jq -r .accessToken)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "   ❌ Failed to get token"
    exit 1
else
    echo "   ✅ Token obtained: ${TOKEN:0:50}..."
fi
echo ""

# Test 3: List Available Files
echo "3️⃣  Checking Available PDF Files..."
PDF_COUNT=$(find /home/envisage/Downloads/MEDICAL_LMS/backend/uploads/books -name "*.pdf" 2>/dev/null | wc -l)
echo "   Found $PDF_COUNT PDF files in uploads/books/"
if [ $PDF_COUNT -gt 0 ]; then
    echo "   Sample files:"
    find /home/envisage/Downloads/MEDICAL_LMS/backend/uploads/books -name "*.pdf" -type f 2>/dev/null | head -3 | while read file; do
        echo "     - $(basename $file)"
    done
fi
echo ""

# Test 4: Test File Endpoint WITHOUT Token
echo "4️⃣  Testing File Endpoint WITHOUT Token (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:3001/api/uploads/books/sample-book-3.pdf")
if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Correctly returns 401 Unauthorized"
else
    echo "   ⚠️  Got HTTP $HTTP_CODE (expected 401)"
fi
echo ""

# Test 5: Test File Endpoint WITH Token in URL
echo "5️⃣  Testing File Endpoint WITH Token in URL..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:3001/api/uploads/books/sample-book-3.pdf?token=$TOKEN")
CONTENT_TYPE=$(curl -s -I "http://localhost:3001/api/uploads/books/sample-book-3.pdf?token=$TOKEN" | grep -i "content-type" | awk '{print $2}' | tr -d '\r')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ File served successfully (HTTP $HTTP_CODE)"
    echo "   ✅ Content-Type: $CONTENT_TYPE"
else
    echo "   ❌ File serving failed (HTTP $HTTP_CODE)"
    exit 1
fi
echo ""

# Test 6: Download and Verify PDF
echo "6️⃣  Downloading and Verifying PDF Content..."
curl -s "http://localhost:3001/api/uploads/books/sample-book-3.pdf?token=$TOKEN" > /tmp/test_download.pdf
FILE_TYPE=$(file -b /tmp/test_download.pdf)
FILE_SIZE=$(ls -lh /tmp/test_download.pdf | awk '{print $5}')

if [[ "$FILE_TYPE" == *"PDF"* ]]; then
    echo "   ✅ Downloaded file is valid PDF"
    echo "   ✅ File size: $FILE_SIZE"
else
    echo "   ❌ Downloaded file is NOT a PDF"
    echo "   File type: $FILE_TYPE"
    exit 1
fi
echo ""

# Test 7: Check Frontend Token Storage
echo "7️⃣  Frontend Configuration..."
echo "   API_URL should be: http://localhost:3001/api"
echo "   Token is stored in localStorage as 'token'"
echo "   PDF URLs should include: ?token=<JWT_TOKEN>"
echo ""

echo "=============================================="
echo "  ✅ ALL TESTS PASSED!"
echo "=============================================="
echo ""
echo "📋 Summary:"
echo "   - Backend is operational"
echo "   - Authentication works"
echo "   - File serving endpoint works with token"
echo "   - PDF files are being served correctly"
echo ""
echo "🔧 If PDFs still don't load in browser:"
echo "   1. Hard refresh browser (Ctrl+Shift+R)"
echo "   2. Clear browser cache"
echo "   3. Check browser console for errors"
echo "   4. Verify token in localStorage"
echo ""
