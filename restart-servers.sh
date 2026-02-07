#!/bin/bash

echo "================================================"
echo "🔄 Bitflow Medical LMS - Server Restart"
echo "================================================"
echo ""

# Navigate to project root
cd /home/envisage/Downloads/MEDICAL_LMS

# Stop existing processes
echo "🛑 Stopping existing servers..."
lsof -ti:3000,3001 | xargs -r kill -9 2>/dev/null
sleep 2
echo "✅ Ports cleared"
echo ""

# Start Backend
echo "🚀 Starting Backend Server..."
cd /home/envisage/Downloads/MEDICAL_LMS/backend
nohup npm run start:dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo "   Waiting for backend to start..."
sleep 8

# Start Frontend
echo ""
echo "🚀 Starting Frontend Server..."
cd /home/envisage/Downloads/MEDICAL_LMS/frontend
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo "   Waiting for frontend to compile..."
sleep 12

# Check status
echo ""
echo "================================================"
echo "📊 Server Status Check"
echo "================================================"
cd /home/envisage/Downloads/MEDICAL_LMS
./check-servers.sh

echo ""
echo "================================================"
echo "🌐 Access URLs:"
echo "================================================"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3001/api"
echo ""
echo "💡 Tip: Run './check-servers.sh' anytime to check server status"
echo "================================================"
