# Backend API Reference

Base URL: `http://localhost:4000/api/v1`

## Authentication

### Register
```
POST /auth/register
Body: { email, password, name? }
Response: { user: { id, email, name }, accessToken }
```

### Login
```
POST /auth/login
Body: { email, password }
Response: { user: { id, email, name }, accessToken }
```

### Get Current User
```
GET /auth/me
Headers: Authorization: Bearer <token>
Response: { user }
```

## Projects

All project endpoints require authentication (Bearer token).

### List Projects
```
GET /projects
Response: { projects: [...] }
```

### Get Project
```
GET /projects/:projectId
Response: { project }
```

### Create Project
```
POST /projects
Body: { name, description?, columns? }
Response: { project }
```

### Update Project
```
PATCH /projects/:projectId
Body: { name?, description?, columns? }
Response: { project }
```

### Delete Project
```
DELETE /projects/:projectId
Response: 204 No Content
```

## Tasks

All task endpoints require authentication and project access.

### List Tasks
```
GET /projects/:projectId/tasks
Response: { tasks: [...] }
```

### Create Task
```
POST /projects/:projectId/tasks
Body: { title, columnKey, order, description?, color?, labels?, estimate? }
Response: { task }
```

### Update Task
```
PATCH /projects/:projectId/tasks/:taskId
Body: { title?, description?, color?, columnKey?, order?, assigneeId?, labels?, estimate? }
Response: { task }
```

### Delete Task
```
DELETE /projects/:projectId/tasks/:taskId
Response: 204 No Content
```

### Reorder Tasks (bulk)
```
PATCH /projects/:projectId/tasks-reorder
Body: { tasks: [{ id, order, columnKey? }, ...] }
Response: { success: true }
```

### Import Local Tasks (migration)
```
POST /projects/:projectId/import-local
Body: { tasks: [{ title, column, color? }, ...], importId? }
Response: { tasks: [...], imported: number }
```

## Error Responses

All errors return JSON with `{ error: "message" }` and appropriate status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error
