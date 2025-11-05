#!/bin/bash

# API Test Script for Kanban Backend
# Tests all major endpoints with the demo user

BASE_URL="http://localhost:4000/api/v1"
TOKEN=""

echo "Testing Kanban Backend API"
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s ${BASE_URL%/api/v1}/health)
if [[ $HEALTH == *"ok"* ]]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi
echo ""

# Test 2: Login
echo "2️⃣  Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@kanban.local","password":"demo123"}')

if [[ $LOGIN_RESPONSE == *"accessToken"* ]]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  echo "✅ Login successful"
  echo "   Token: ${TOKEN:0:20}..."
else
  echo "❌ Login failed"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Get Current User
echo "3️⃣  Testing /auth/me..."
ME_RESPONSE=$(curl -s $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN")

if [[ $ME_RESPONSE == *"demo@kanban.local"* ]]; then
  echo "✅ Get current user successful"
else
  echo "❌ Get current user failed"
  echo "   Response: $ME_RESPONSE"
fi
echo ""

# Test 4: List Projects
echo "4️⃣  Testing list projects..."
PROJECTS_RESPONSE=$(curl -s $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN")

if [[ $PROJECTS_RESPONSE == *"projects"* ]]; then
  PROJECT_ID=$(echo $PROJECTS_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✅ List projects successful"
  echo "   Found project ID: $PROJECT_ID"
else
  echo "❌ List projects failed"
  echo "   Response: $PROJECTS_RESPONSE"
fi
echo ""

# Test 5: Get Project Details
if [ -n "$PROJECT_ID" ]; then
  echo "Testing get project details..."
  PROJECT_RESPONSE=$(curl -s $BASE_URL/projects/$PROJECT_ID \
    -H "Authorization: Bearer $TOKEN")
  
  if [[ $PROJECT_RESPONSE == *"columns"* ]]; then
    echo "✅ Get project successful"
  else
    echo "❌ Get project failed"
  fi
  echo ""
fi

# Test 6: List Tasks
if [ -n "$PROJECT_ID" ]; then
  echo "6️⃣  Testing list tasks..."
  TASKS_RESPONSE=$(curl -s $BASE_URL/projects/$PROJECT_ID/tasks \
    -H "Authorization: Bearer $TOKEN")
  
  if [[ $TASKS_RESPONSE == *"tasks"* ]]; then
    TASK_COUNT=$(echo $TASKS_RESPONSE | grep -o '"_id":' | wc -l)
    echo "✅ List tasks successful"
    echo "   Found $TASK_COUNT tasks"
  else
    echo "❌ List tasks failed"
  fi
  echo ""
fi

# Test 7: Create New Task
if [ -n "$PROJECT_ID" ]; then
  echo "7️⃣  Testing create task..."
  CREATE_TASK_RESPONSE=$(curl -s -X POST $BASE_URL/projects/$PROJECT_ID/tasks \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Task from API","columnKey":"to-do","order":5000,"color":"purple.300"}')
  
  if [[ $CREATE_TASK_RESPONSE == *"Test Task from API"* ]]; then
    NEW_TASK_ID=$(echo $CREATE_TASK_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    echo "✅ Create task successful"
    echo "   New task ID: $NEW_TASK_ID"
  else
    echo "❌ Create task failed"
    echo "   Response: $CREATE_TASK_RESPONSE"
  fi
  echo ""
fi

# Test 8: Update Task
if [ -n "$NEW_TASK_ID" ]; then
  echo "8️⃣  Testing update task..."
  UPDATE_RESPONSE=$(curl -s -X PATCH $BASE_URL/projects/$PROJECT_ID/tasks/$NEW_TASK_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Updated Task Title","description":"This task was updated via API"}')
  
  if [[ $UPDATE_RESPONSE == *"Updated Task Title"* ]]; then
    echo "✅ Update task successful"
  else
    echo "❌ Update task failed"
  fi
  echo ""
fi

echo "================================"
echo "✅ All tests completed!"
echo ""
echo "API Base URL: $BASE_URL"
echo "Demo credentials: demo@kanban.local / demo123"
