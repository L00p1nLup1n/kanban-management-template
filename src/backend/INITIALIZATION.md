# MongoDB & Mongoose Initialization Complete ✅

## What was initialized

### 1. MongoDB Database
- **Database name**: `kanban`
- **Connection**: Running locally on `mongodb://localhost:27017`
- **Status**: ✅ Connected and operational

### 2. Collections Created
Three main collections with proper schemas and indexes:

#### Users Collection
- Email (unique index)
- Password (bcrypt hashed)
- Name
- Timestamps (createdAt, updatedAt)

#### Projects Collection
- Owner reference to User
- Name and description
- Customizable columns array
- Timestamps
- **Index**: `ownerId` for fast user project lookups

#### Tasks Collection  
- Project reference
- Column key (which column the task belongs to)
- Title, description, color
- Order (numeric for drag/drop sorting)
- Labels, estimate, assignee
- Created by reference
- Timestamps
- **Compound index**: `(projectId, columnKey, order)` for efficient task queries

### 3. Demo Data Created

**Demo User**:
- Email: `demo@kanban.local`
- Password: `demo123`
- Use these credentials to test the API

**Demo Project**: "My First Kanban Board"
- 4 columns: Hot tasks, To do, In work, Done
- 4 sample tasks (one in each column)

### 4. Backend Server
- **Running on**: `http://localhost:4000`
- **Health check**: `http://localhost:4000/health`
- **API base**: `http://localhost:4000/api/v1`

## Available Scripts

From `src/backend/` directory:

```bash
# Start the server (with auto-reload)
npm run dev

# Start the server (production)
npm start

# Initialize/reset database with demo data
npm run init-db

# Test MongoDB connection
npm run test-connection

# Test all API endpoints
npm run test-api
```

## API Endpoints Available

### Authentication
- `POST /api/v1/auth/register` - Create new user
- `POST /api/v1/auth/login` - Login and get token
- `GET /api/v1/auth/me` - Get current user (requires auth)

### Projects
- `GET /api/v1/projects` - List user's projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project details
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Tasks
- `GET /api/v1/projects/:id/tasks` - List tasks
- `POST /api/v1/projects/:id/tasks` - Create task
- `PATCH /api/v1/projects/:id/tasks/:taskId` - Update task
- `DELETE /api/v1/projects/:id/tasks/:taskId` - Delete task
- `PATCH /api/v1/projects/:id/tasks-reorder` - Bulk reorder
- `POST /api/v1/projects/:id/import-local` - Import from localStorage

## Quick Test

```bash
# 1. Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@kanban.local","password":"demo123"}'

# 2. Use the token from response
export TOKEN="<your_token_here>"

# 3. List projects
curl http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN"

# 4. List tasks (use project ID from previous response)
curl http://localhost:4000/api/v1/projects/<PROJECT_ID>/tasks \
  -H "Authorization: Bearer $TOKEN"
```

## Environment Variables

Located in `src/backend/.env`:
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (default: 4000)
- `FRONTEND_ORIGIN` - CORS allowed origin
- `JWT_SECRET` - Secret for JWT tokens (auto-generated)

## Database Stats

Current state:
- **Users**: 1 (demo user)
- **Projects**: 1 (demo project with 4 columns)
- **Tasks**: 4 (sample tasks)

## Next Steps

The backend is fully initialized and ready for frontend integration:

1. ✅ MongoDB connected
2. ✅ Schemas created with indexes
3. ✅ Demo data populated
4. ✅ Server running on port 4000
5. ✅ All API endpoints functional

You can now:
- Start building the frontend API client
- Create auth pages (Login/Register)
- Wire up project and task management UI
- Test with the demo credentials
