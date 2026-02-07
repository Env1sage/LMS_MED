#!/bin/bash
# Get a token for testing
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@psgcas.ac.in","password":"Admin@123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Testing course analytics..."
curl -s http://localhost:3001/api/governance/course-analytics/overview \
  -H "Authorization: Bearer $TOKEN"
