# Phase 4 — Comments, Activity Audit Trail & Dashboard Analytics

## 1. Overview & Objectives
Phase 4 completes the remaining mandatory functional requirements for BugBoard:
1. **Threaded Discussion & Comments**:
   - Authenticated project members can post comments to bugs.
   - Author anti-spoofing strictly enforced server-side via `req.user.id`.
   - Comments are displayed chronologically (oldest-first) with author names, roles, and relative timestamps.
2. **Granular Activity Audit Trail**:
   - Changes to `title`, `priority`, and `severity` generate immutable `Activity` audit records.
   - Status transitions and reassignments continue to generate audit records.
   - **Deliberate Design Decision**: `description` mutations are explicitly excluded from activity logging to prevent log flooding and noisy timeline records.
   - Timeline renders sentence-style entries (e.g. `Priya changed priority: Medium → High`).
3. **High-Performance Dashboard Analytics**:
   - `GET /api/v1/dashboard/summary` delivers aggregate counters (`total`, `open`, `inProgress`, `critical`, `resolved`) and `assignedToMe` in a single database roundtrip using a MongoDB `$facet` aggregation pipeline.
   - Respects user project visibility (Admins see system-wide data; Developers and Testers see issues from their member projects).
   - "Assigned to me" is capped at 5 items and sorted by priority weight (`Urgent` > `High` > `Medium` > `Low`), then `createdAt` descending.

---

## 2. Key Architectural Decisions

| Decision | Implementation Choice | Rationale |
|---|---|---|
| **Author Anti-Spoofing** | Server overrides `author` with `req.user.id` | Prevents malicious users from forging comments on behalf of admins or leads. |
| **Comment Immutability** | No edit/delete endpoints in Phase 4 | Ensures historical accountability in bug resolution discussions. |
| **Oldest-First Comment Sorting** | `createdAt: 1` ascending order | Natural conversation thread reading flow from top to bottom. |
| **Description Exclusion** | Excluded from `Activity` logging | Long descriptions create massive, unreadable diff blocks in audit feeds. |
| **Single `$facet` Pipeline** | MongoDB aggregation with `$match` and `$facet` | Avoids 5+ separate queries or N+1 lookups; performs all counts and lookups in one server-database roundtrip. |
| **Priority Weighting** | `$switch` branch mapping Urgent: 4, High: 3, Medium: 2, Low: 1 | Ensures critical/urgent work surfaces at the top of personal queues. |

---

## 3. API Surface & Validation

### 3.1 `POST /api/v1/issues/:issueId/comments`
- **Security**: Requires authenticated user with project membership (Admins universal).
- **Validation**:
  - `content`: String, required, trimmed, min length 1, max length 2000.
- **Output**: `201 Created` with populated `author: { _id, name, email, role }`.

### 3.2 `GET /api/v1/issues/:issueId/comments`
- **Security**: Requires project membership (Admins universal).
- **Query Parameters**:
  - `page`: Integer >= 1 (default: 1)
  - `limit`: Integer 1–100 (default: 20)
- **Output**: `200 OK` with `{ data, page, limit, total, totalPages }` ordered `createdAt: 1`.

### 3.3 `GET /api/v1/issues/:issueId/activity` (or `GET /api/v1/issues/:issueId/activities`)
- **Security**: Requires project access.
- **Output**: `200 OK` array of activities sorted `createdAt: -1` with populated `actor: { _id, name, email, role }`.

### 3.4 `GET /api/v1/dashboard/summary`
- **Security**: Authenticated user.
- **Scoping**:
  - Admins: System-wide across all projects.
  - Non-Admins: Restricted to projects where `project.members` includes `req.user.id`.
- **Output**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totals": {
      "total": 6,
      "open": 2,
      "inProgress": 2,
      "critical": 2,
      "resolved": 1
    },
    "assignedToMe": [
      {
        "_id": "6ab0159f2f4c1b430e8bd241",
        "title": "Auth token expires prematurely",
        "status": "In Progress",
        "priority": "Urgent",
        "severity": "Critical",
        "createdAt": "2026-09-20T17:15:00.000Z",
        "project": {
          "_id": "...",
          "key": "ALP",
          "name": "Alpha Project"
        }
      }
    ]
  }
}
```

---

## 4. Frontend Component Implementations

1. **`CommentForm.jsx` & `CommentForm.css`**:
   - Embedded character counter (warns above 1800, turns danger above 2000).
   - `Ctrl+Enter` / `Cmd+Enter` keyboard submission shortcut.
   - Disabled states during async operations.
   - Automatically clears and resets on successful submission.
2. **`CommentList.jsx` & `CommentList.css`**:
   - Fetches comments in chronological order.
   - Displays avatar initials, author name, role badge, and relative timestamps ("2m ago", "1h ago").
   - Preserves line breaks in comment content.
   - Renders polite empty state when no comments exist.
   - Integrates `CommentForm` at the bottom for unified discussion flow.
3. **`ActivityTimeline.jsx` & `ActivityTimeline.css`**:
   - Sentence-style timeline entries:
     - `Priya changed priority: Medium → High`
     - `Tom changed status: In Progress → Testing`
     - `Admin changed severity: High → Critical`
     - `Dev changed title from "Old Title" → "New Title"`
     - `Dev reassigned this issue: Tom → Priya`
4. **`DashboardPage.jsx` & `DashboardPage.css`**:
   - Compact single-row responsive 6-card metrics layout.
   - Displays Total, Open, In Progress, Testing, Resolved, and Critical bug counters.
   - Priority-ranked personal task queue with project key badges and workflow status.

---

## 5. Automated Verification
All Phase 4 functionality is verified by `server/tests/phase4.test.js` (11 passing tests):
- ✅ Non-member receives 403 Forbidden when attempting to post comment on foreign project.
- ✅ Comment creation enforces author anti-spoofing using `req.user.id`.
- ✅ Comment content validation rejects empty body or text > 2000 characters.
- ✅ Comments listing returns oldest-first ordering with pagination.
- ✅ Non-member receives 403 when attempting to list comments on foreign project issue.
- ✅ Updating title, priority, and severity records Activity entries.
- ✅ Updating description does NOT create an Activity log entry.
- ✅ `GET /api/v1/issues/:issueId/activity` returns timeline list with actor populated.
- ✅ Admin dashboard summary returns system-wide metrics across all projects.
- ✅ Non-Admin (Dev) dashboard summary scopes counts strictly to member projects.
- ✅ `assignedToMe` is capped at 5 and sorted by priority descending, then createdAt descending.
