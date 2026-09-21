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
- **System-Generated Fields**: Assigns a sequential, role-prefixed, zero-padded `employeeId` (`DEV-0001`, `TST-0001`) atomically via the `Counter` collection. Clients cannot specify or override this field.
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
      "role": "Admin",
      "employeeId": "ADM-0001",
      "designation": "Platform Administrator"
    }
  }
}
```

### `PATCH /auth/change-password`
Self-service password update for the currently authenticated user. Invalidates all other existing sessions by updating `passwordChangedAt`.
- **Auth**: Bearer JWT (any active role)
- **Body**: `{ currentPassword, newPassword, confirmNewPassword }`
- **Validation**:
  - `currentPassword`: required, must match stored bcrypt hash (returns `422` with inline field error if mismatch)
  - `newPassword`: required, min 8 characters, must differ from current password
  - `confirmNewPassword`: required, must match `newPassword`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Password updated successfully. Please sign in again for security."
}
```

### `POST /auth/forgot-password`
Initiates a password reset workflow. Always returns an identical generic confirmation message to prevent account enumeration.
- **Auth**: None (Public, rate-limited via `authRateLimiter`)
- **Body**: `{ email }`
- **Anti-Enumeration Safeguard**: Only active accounts (`isActive === true`) generate a 32-byte crypto token and receive a reset email; inactive or non-existent accounts receive the exact same 200 response without generating tokens or dispatching emails.
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset link has been sent."
}
```

### `POST /auth/reset-password`
Completes password reset using a single-use crypto token received via email.
- **Auth**: None (Public, rate-limited via `authRateLimiter`)
- **Body**: `{ token, newPassword, confirmNewPassword }`
- **Lifecycle & Security**: The raw token is verified against `passwordResetTokenHash` (SHA-256) and `passwordResetExpires` (30-minute TTL). Upon success, the token is cleared (`null`), preventing replay attacks, and `passwordChangedAt` is updated to invalidate pre-existing sessions.
- **Response**: `200 OK` on success, or `400 Bad Request` if token is invalid, expired, or already used.
```json
{
  "success": true,
  "message": "Password reset successful. You can now log in with your new password."
}
```

---

## 3. Users & Profiles
### `GET /users/me`
Retrieves the full profile of the currently authenticated user.
- **Auth**: Bearer JWT (any active role)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6aaf7f1dce6eab64e7cc44cb",
      "name": "Alice Developer",
      "email": "alice@bugboard.test",
      "role": "Developer",
      "employeeId": "DEV-0001",
      "designation": "Senior Backend Engineer",
      "phone": "+1-555-0199",
      "avatarUrl": "https://example.com/avatar.jpg",
      "isActive": true,
      "createdAt": "2026-03-15T10:00:00.000Z"
    }
  }
}
```

### `PATCH /users/me`
Self-service profile update for the currently authenticated user.
- **Auth**: Bearer JWT (any active role)
- **Body**: `{ name?, phone?, avatarUrl? }`
- **Mass-Assignment Guard**: Attempts to update `employeeId`, `designation`, `isActive`, or `role` are rejected with `422 Unprocessable Entity`.
- **Response**: `200 OK` Updated user profile

### `GET /users`
Directory of users. Admins see all users with profile data and can filter by role. Non-admins see only non-admin co-members in shared projects.
- **Auth**: Bearer JWT
- **Query Params**: `?role=Developer` (optional, Admin only: `Admin` | `Developer` | `Tester`)
- **Response**: `200 OK` Array of user objects

### `GET /users/:userId`
Retrieves detailed profile information for a specific user.
- **Auth**: Bearer JWT (`Admin` role only)
- **Response**: `200 OK` User profile, or `404 Not Found`

### `PATCH /users/:userId`
Administrative update for a user account (designation, active status).
- **Auth**: Bearer JWT (`Admin` role only)
- **Body**: `{ designation?, isActive? }`
- **Immutability & Blanket Guards**:
  - `employeeId`: System-generated and immutable. Any `employeeId` included in the request body is silently ignored and never modifies the database value.
  - **Self-Target Guard**: Administrators cannot modify their own record via this endpoint (`:userId === req.user.id`). The entire request is rejected with `403 Forbidden` (`"Use your profile page to update your own information; administrators cannot edit their own organizational record through this endpoint."`).
- **Response**: `200 OK` Updated user document

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

### `GET /issues/:issueId/activities` (or `GET /issues/:issueId/activity`)
Retrieves the audit activity trail for an issue.
- **Auth**: Bearer JWT (requires project access)
- **Response**: `200 OK` array of activities sorted by `createdAt: -1` with populated actor.

---

## 6. Comments
### `POST /issues/:issueId/comments`
Adds an immutable discussion comment to an issue. The author is strictly populated from the authenticated user token (anti-spoofing).
- **Auth**: Bearer JWT (requires project membership or Admin)
- **Body**: `{ "content": "Root cause identified in token expiration handler." }`
- **Validation**: `content` required, 1–2000 characters.
- **Responses**:
  - `201 Created` with created comment and populated `author`
  - `403 Forbidden` if user is not a member of the project
  - `422 Unprocessable Entity` if content is missing or exceeds 2000 characters

### `GET /issues/:issueId/comments`
Retrieves comments for an issue in chronological order (oldest-first, `createdAt: 1`) with pagination.
- **Auth**: Bearer JWT (requires project membership or Admin)
- **Query Parameters**:
  - `page`: Integer >= 1 (default 1)
  - `limit`: Integer 1–100 (default 20)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "6aaf7f1dce6eab64e7cc44ee",
      "issue": "6aaf7f1dce6eab64e7cc44aa",
      "author": {
        "_id": "6aaf7f1dce6eab64e7cc44cb",
        "name": "Priya Dev",
        "email": "priya@bugboard.test",
        "role": "Developer"
      },
      "content": "Root cause identified in token expiration handler.",
      "createdAt": "2026-09-20T17:15:00.000Z",
      "updatedAt": "2026-09-20T17:15:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

---

## 7. Dashboard Analytics
### `GET /dashboard/summary`
Phase 4 aggregate analytics computed via a single database-side MongoDB `$facet` aggregation pipeline.
- **Auth**: Bearer JWT
- **Scoping**: Universal system-wide for Admins; scoped strictly to member projects for Developers and Testers.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totals": {
      "total": 24,
      "open": 8,
      "inProgress": 5,
      "critical": 3,
      "resolved": 6
    },
    "assignedToMe": [
      {
        "_id": "6aaf7f1dce6eab64e7cc44aa",
        "title": "Database connection pool leakage",
        "status": "In Progress",
        "priority": "Urgent",
        "severity": "Critical",
        "createdAt": "2026-09-20T10:00:00.000Z",
        "project": {
          "_id": "6aaf7f1dce6eab64e7cc4499",
          "key": "BBC",
          "name": "BugBoard Core"
        }
      }
    ]
  }
}
```

### `GET /dashboard`
Provides rich live engineering console metrics including status breakdown, severity breakdown, priority breakdown, and recent activity trail.
- **Auth**: Bearer JWT (scoped to accessible projects)
- **Response**: `200 OK`

---

## 8. Attachments (File Upload & Download)
### `POST /issues/:issueId/attachments`
Uploads a binary file attachment to an issue. Physical file is written to storage before creating the database document.
- **Auth**: Bearer JWT (must be a member of the project or Admin)
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (Max 5MB; supported formats: PNG, JPEG, GIF, PDF, TXT, LOG)
- **Responses**:
  - `201 Created` with attachment metadata
  - `403 Forbidden` if not a project member
  - `422 Unprocessable Entity` if file exceeds 5MB or invalid MIME type

### `GET /issues/:issueId/attachments`
Lists all attachments for an issue.
- **Auth**: Bearer JWT (requires project access)
- **Response**: `200 OK` Array of attachment metadata

### `GET /attachments/:attachmentId/download`
Streams the binary file attachment to the client.
- **Auth**: Bearer JWT (requires project access at download time)
- **Responses**:
  - `200 OK` Streaming binary download with `Content-Disposition: attachment; filename="..."`
  - `403 Forbidden` if user is not currently an active member of the issue's project

---

## 9. Notifications
### `GET /notifications`
Lists notifications for the currently authenticated user with unread notifications sorted first.
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `limit`: Integer (default 20, max 100)
- **Response**: `200 OK` with unread count and notification array

### `PATCH /notifications/:notificationId/read`
Marks a specific notification as read. Cross-user modification is strictly prohibited.
- **Auth**: Bearer JWT (only the recipient can mark as read; non-recipients get 404)
- **Response**: `200 OK`

### `PATCH /notifications/read-all`
Marks all unread notifications for the currently authenticated user as read.
- **Auth**: Bearer JWT
- **Response**: `200 OK`

---

## 10. Deletions & Cascading Cleanup
### `DELETE /issues/:issueId`
Deletes an issue and cascades cleanup.
- **Auth**: Bearer JWT (`Admin` or the original `reporter`)
- **Cascade Behavior**: Automatically deletes all child `Comment` documents, child `Activity` records, queries child `Attachment` records, deletes physical files from storage, and deletes the `Attachment` documents from MongoDB.
- **Responses**:
  - `200 OK` `{ "success": true, "message": "Issue deleted successfully" }`
  - `403 Forbidden` if caller is not the reporter or an Admin
  - `404 Not Found` if issue does not exist

### `DELETE /projects/:projectId`
Deletes a project and all associated resources.
- **Auth**: Bearer JWT (`Admin` role only)
- **Cascade Behavior**: Cascades across all issues in the project, deleting all comments, activities, attachments, physical files, and issue documents.
- **Responses**:
  - `200 OK` `{ "success": true, "message": "Project and all associated issues deleted successfully" }`
  - `403 Forbidden` if non-admin attempts deletion

---

## 11. Postman Collection
A complete, runnable Postman Collection v2.1.0 is available at:
📁 **[`docs/postmancollection.json`](file:///d:/Bug_Board_assignment/docs/postmancollection.json)**

### Features:
- Pre-configured with base URL `{{baseUrl}}` (`http://localhost:5000/api/v1`).
- Automatic token extraction: logging in as Admin, Developer, or Tester automatically sets `{{token}}` for subsequent requests.
- Full coverage of all 10 endpoint categories with sample bodies and descriptions.
- Ready for one-click import into Postman, Insomnia, or Bruno.


