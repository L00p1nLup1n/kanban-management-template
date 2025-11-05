# Backend API

This folder contains the Express + Mongoose backend for the Kanban app with full CRUD routes for auth, projects, and tasks.

## Quick start

```bash
cd src/backend
npm install
cp .env.example .env
# edit .env (set MONGO_URI, JWT_SECRET, etc.)
npm run dev
```

The server listens on the port configured in `.env` (default 4000).

## API Endpoints

See [API.md](./API.md) for full endpoint documentation.

Key routes:
- `POST /api/v1/auth/register` - register new user
- `POST /api/v1/auth/login` - login
- `GET /api/v1/auth/me` - get current user (requires auth)
- `GET /api/v1/projects` - list projects (requires auth)
- `POST /api/v1/projects` - create project
- `GET /api/v1/projects/:projectId/tasks` - list tasks
- `POST /api/v1/projects/:projectId/tasks` - create task
- `PATCH /api/v1/projects/:projectId/tasks/:taskId` - update task
- `POST /api/v1/projects/:projectId/import-local` - import tasks from localStorage

## Testing

Use `curl`, Postman, or HTTPie to test endpoints. Example:

```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret","name":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'

# Create project (use token from login)
curl -X POST http://localhost:4000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"My Project"}'
```
