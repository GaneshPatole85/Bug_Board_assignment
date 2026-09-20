# BugBoard API Documentation (v1)

Base URL: `http://localhost:5000/api/v1`

---

## 1. System Health
### `GET /health`
Returns the status of the API server and database connection.
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "status": "healthy",
  "database": {
    "status": "connected",
    "readyState": 1,
    "host": "127.0.0.1"
  }
}
```

---

## 2. Authentication
### `POST /auth/register`
Self-service registration for `Developer` or `Tester` roles (Admin cannot be self-registered).
- **Body**: `{ name, email, password, role }`
- **Response**: `201 Created`

### `POST /auth/login`
Authenticates a user and issues a signed JWT.
- **Body**: `{ email, password }`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "_id": "6aaf7f1dce6eab64e7cc44cb",
      "name": "Admin User",
      "email": "admin@bugboard.test",
      "role": "Admin"
    }
  }
}
```

---

## 3. Users Directory
### `GET /users`
Returns list of all active users in the system for member assignment.
- **Auth**: Bearer JWT
- **Response**: `200 OK` array of `{ _id, name, email, role }`

---

## 4. Projects
### `POST /projects`
Creates a new project. Automatically adds the creating Admin to the members array.
- **Auth**: Bearer JWT (`Admin` role only)
- **Body**:
```json
{
  "name": "Core Platform Engine",
  "key": "CORE",
  "description": "Platform architecture and event services",
  "members": ["6aaf7f1dce6eab64e7cc44cc"]
}
```
- **Responses**:
  - `201 Created` Project document
  - `409 Conflict` Key already in use
  - `422 Unprocessable Entity` Invalid format or non-existent member IDs

### `GET /projects`
Retrieves projects accessible to the current user. Admins see all projects; Developers and Testers only see projects where they are members.
- **Auth**: Bearer JWT
- **Response**: `200 OK` array with enriched `issueCount` and `memberCount`.

### `GET /projects/:projectId`
Retrieves a single project by its ID.
- **Auth**: Bearer JWT (`Admin` or project member)
- **Response**: `200 OK` Project details with populated members array.

### `PATCH /projects/:projectId`
Updates an existing project.
- **Auth**: Bearer JWT (`Admin` role only)
- **Body**: `{ name?, description?, members? }` (key is immutable)
- **Response**: `200 OK`

---

## 5. Issues
### `POST /issues`
Reports a new issue. Reporter is strictly set to `req.user.id` server-side.
- **Auth**: Bearer JWT (must be a member of the project or `Admin`)
- **Body**:
```json
{
  "title": "Buffer allocation leak in worker thread",
  "description": "Worker fails to garbage collect buffers under high load",
  "project": "6aaf7f1dce6eab64e7cc44d0",
  "severity": "Critical",
  "priority": "Urgent",
  "assignee": "6aaf7f1dce6eab64e7cc44cc"
}
```
- **Responses**:
  - `201 Created`
  - `422 Unprocessable Entity` If assignee is not a member of the project

### `GET /issues`
Lists issues with server-side query filters, full-text search, sorting, and pagination.
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `project`: Project ObjectId filter
  - `status`: `Open` | `In Progress` | `Testing` | `Resolved` | `Closed`
  - `priority`: `Low` | `Medium` | `High` | `Urgent`
  - `severity`: `Low` | `Medium` | `High` | `Critical`
  - `assignee`: User ObjectId or `unassigned`
  - `reporter`: User ObjectId
  - `search`: Keyword string for full-text search across title and description
  - `sort`: `createdAt` | `-createdAt` | `priority` | `-priority` | `severity` | `-severity` | `status` | `-status`
  - `page`: Integer >= 1 (default 1)
  - `limit`: Integer between 1 and 100 (default 20)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 45,
  "totalPages": 3
}
```

### `GET /issues/:issueId`
Retrieves issue details by ID.
- **Auth**: Bearer JWT (requires project access)
- **Response**: `200 OK` with populated `project`, `reporter`, and `assignee`.

### `PATCH /issues/:issueId`
Updates general issue fields: `title`, `description`, `priority`, `severity`. Rejects `status` or `assignee` mutations.
- **Auth**: Bearer JWT (requires project access)
- **Response**: `200 OK`

### `PATCH /issues/:issueId/status`
Executes status transition through the centralized state machine. Creates an `Activity` record.
- **Auth**: Bearer JWT (role-gated by transition matrix)
- **Body**: `{ "status": "In Progress" }`
- **Responses**:
  - `200 OK` Status updated
  - `400 Bad Request` Invalid transition edge or unauthorized role

### `PATCH /issues/:issueId/assignee`
Reassigns or unassigns an issue. Validates assignee project membership. Creates an `Activity` record.
- **Auth**: Bearer JWT (requires project access)
- **Body**: `{ "assignee": "6aaf7f1dce6eab64e7cc44cc" }` (or `null` to unassign)
- **Responses**:
  - `200 OK` Assignee updated
  - `422 Unprocessable Entity` Assignee not a project member

### `GET /issues/:issueId/activities`
Retrieves the audit activity trail for an issue.
- **Auth**: Bearer JWT (requires project access)
- **Response**: `200 OK` array of activities sorted by `createdAt: -1` with populated actor.
