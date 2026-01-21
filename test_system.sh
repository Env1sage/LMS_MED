#!/bin/bash
echo "=== TESTING PHASE 0-5 ==="

# Test login for all roles
echo "1. Testing Bitflow Owner..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}' | grep -q "accessToken" && echo "✓ Bitflow Owner OK" || echo "✗ FAILED"

echo "2. Testing Publisher Admin..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elsevier.com","password":"Password123!"}' | grep -q "accessToken" && echo "✓ Publisher Admin OK" || echo "✗ FAILED"

echo "3. Testing College Admin..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiimsnagpur.edu.in","password":"Password123!"}' | grep -q "accessToken" && echo "✓ College Admin OK" || echo "✗ FAILED"

echo "4. Testing Faculty..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@aiimsnagpur.edu.in","password":"Password123!"}' | grep -q "accessToken" && echo "✓ Faculty OK" || echo "✗ FAILED"

echo "5. Testing Student..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@student.aiimsnagpur.edu.in","password":"Password123!"}' | grep -q "accessToken" && echo "✓ Student OK" || echo "✗ FAILED"

echo ""
echo "6. Testing frontend..."
curl -s http://localhost:3000 | grep -q "html" && echo "✓ Frontend OK" || echo "✗ FAILED"

echo ""
echo "=== ALL DONE ==="
echo "Open browser: http://localhost:3000"
echo "Login: owner@bitflow.com / BitflowAdmin@2026"
