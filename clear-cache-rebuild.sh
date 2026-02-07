#!/bin/bash

# Medical LMS - Complete Cache Clear and Rebuild Script
# This will force a complete rebuild and clear all caches

echo "🧹 Medical LMS - Complete Cache Clear & Rebuild"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill all running instances
echo -e "${YELLOW}Step 1: Stopping all running instances...${NC}"
pkill -9 -f "react-scripts" 2>/dev/null && echo "✅ Frontend stopped" || echo "⚠️  No frontend process found"
pkill -9 -f "nest start" 2>/dev/null && echo "✅ Backend stopped" || echo "⚠️  No backend process found"
sleep 2

# Clear frontend caches
echo -e "\n${YELLOW}Step 2: Clearing frontend caches...${NC}"
cd frontend || { echo -e "${RED}❌ Frontend directory not found${NC}"; exit 1; }

echo "   Removing node_modules/.cache..."
rm -rf node_modules/.cache && echo "   ✅ node_modules/.cache removed" || echo "   ⚠️  No cache found"

echo "   Removing build directory..."
rm -rf build && echo "   ✅ build directory removed" || echo "   ⚠️  No build directory"

echo "   Removing .cache..."
rm -rf .cache && echo "   ✅ .cache removed" || echo "   ⚠️  No .cache found"

echo "   Removing service worker..."
rm -rf public/service-worker.js 2>/dev/null && echo "   ✅ service-worker removed" || echo "   ⚠️  No service worker"

echo "   Removing dist..."
rm -rf dist && echo "   ✅ dist removed" || echo "   ⚠️  No dist found"

# Clear npm cache
echo -e "\n${YELLOW}Step 3: Clearing npm cache...${NC}"
npm cache clean --force 2>/dev/null && echo "✅ npm cache cleared" || echo "⚠️  npm cache clear failed"

# Reinstall dependencies (optional but recommended)
read -p "Do you want to reinstall node_modules? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing and reinstalling node_modules...${NC}"
    rm -rf node_modules
    npm install
    echo "✅ Dependencies reinstalled"
fi

# Build with no cache
echo -e "\n${YELLOW}Step 4: Building frontend (no cache)...${NC}"
GENERATE_SOURCEMAP=false SKIP_PREFLIGHT_CHECK=true npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful!${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Start frontend
echo -e "\n${YELLOW}Step 5: Starting frontend...${NC}"
echo -e "${YELLOW}Starting in background...${NC}"
GENERATE_SOURCEMAP=false npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 15

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running at http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo "Check logs at: /tmp/frontend.log"
    exit 1
fi

# Go back to project root
cd ..

# Check backend
echo -e "\n${YELLOW}Step 6: Checking backend...${NC}"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1 || curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is already running${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not running. Starting it...${NC}"
    cd backend
    npm run start:dev > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
    sleep 10
    
    if curl -s http://localhost:3001/api > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is now running${NC}"
    else
        echo -e "${RED}❌ Backend failed to start${NC}"
        echo "Check logs at: /tmp/backend.log"
    fi
fi

echo ""
echo "================================================"
echo -e "${GREEN}🎉 REBUILD COMPLETE!${NC}"
echo "================================================"
echo ""
echo "📋 NEXT STEPS FOR YOU:"
echo ""
echo "1. Open your browser"
echo "2. Go to: http://localhost:3000"
echo "3. Press: Ctrl + Shift + R (Windows/Linux) or Cmd + Shift + R (Mac)"
echo "   This will HARD REFRESH and bypass cache"
echo "4. Logout completely"
echo "5. Login again (to get a fresh token)"
echo "6. Try viewing a PDF"
echo ""
echo "🧪 TEST PAGE:"
echo "   http://localhost:3000/pdf-test.html"
echo ""
echo "📊 WHAT TO CHECK:"
echo "   - Press F12 to open Console"
echo "   - You should see: 'SecurePdfViewer: Token from localStorage'"
echo "   - URL should include: ?token=eyJ..."
echo "   - Status should be: 200 (not 401)"
echo ""
echo "💡 IF STILL NOT WORKING:"
echo "   - Try Incognito/Private mode"
echo "   - Try a different browser"
echo "   - F12 > Application > Clear site data"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: You MUST do a hard refresh in the browser!${NC}"
echo -e "${YELLOW}   Just reloading won't work - use Ctrl+Shift+R${NC}"
echo ""
