#!/bin/bash

echo "================================================"
echo "🏥 Bitflow Medical LMS - Server Status"
echo "================================================"
echo ""

# Check Backend (Port 3001)
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "✅ Backend: RUNNING on port 3001"
    echo "   URL: http://localhost:3001/api"
    curl -s http://localhost:3001/api > /dev/null && echo "   API Response: OK" || echo "   API Response: ERROR"
else
    echo "❌ Backend: NOT RUNNING on port 3001"
fi

echo ""

# Check Frontend (Port 3000)
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: RUNNING on port 3000"
    echo "   URL: http://localhost:3000"
    curl -s http://localhost:3000 > /dev/null && echo "   Web Response: OK" || echo "   Web Response: ERROR"
else
    echo "❌ Frontend: NOT RUNNING on port 3000"
fi

echo ""
echo "================================================"
echo "📝 Recent Logs:"
echo "================================================"

if [ -f backend/backend.log ]; then
    echo ""
    echo "Backend (last 5 lines):"
    tail -5 backend/backend.log | grep -v "prisma:query" | tail -3
fi

if [ -f frontend/frontend.log ]; then
    echo ""
    echo "Frontend (last 5 lines):"
    tail -5 frontend/frontend.log
fi

echo ""
echo "================================================"
