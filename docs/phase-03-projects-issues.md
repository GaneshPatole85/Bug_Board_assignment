# Phase 3 — Projects, Issues, Workflow Engine & Engineering Console UI

## 1. Executive Summary & Objective
Phase 3 delivers the core issue tracking platform of BugBoard:
1. **Projects Management**: Admin creation/updating of projects, team membership association, unique formatted key validation, and project-scoped visibility.
2. **Issue Management**: Comprehensive issue tracking with server-side query filters, full-text search, pagination, and sorting.
3. **Centralized Status Workflow Engine**: Server-enforced transition state machine with role permissions.
4. **Audit Activity Logging**: Automatic tracking of every status and assignee mutation.
5. **Production-Grade "Engineering Console" UI**: Bespoke, fully responsive web interface (desktop, tablet, mobile) adhering to the strict Part B design system tokens.

---

## 2. API Endpoints Specification

### Projects
| Method | URL | Auth | Allowed Roles | Request Payload | Response Status & Data |
|---|---|---|---|---|---|
| `POST` | `/api/v1/projects` | Bearer JWT | `Admin` | `{ name, key, description?, members? }` | `201 Created` with project + populated members |
| `GET` | `/api/v1/projects` | Bearer JWT | All | None | `200 OK` list of accessible projects + `issueCount` & `memberCount` |
| `GET` | `/api/v1/projects/:projectId` | Bearer JWT | `Admin` or Project Member | None | `200 OK` single project details |
| `PATCH` | `/api/v1/projects/:projectId` | Bearer JWT | `Admin` | `{ name?, description?, members? }` | `200 OK` updated project |

### Issues
| Method | URL | Auth | Allowed Roles | Query / Request Payload | Response Status & Data |
|---|---|---|---|---|---|
| `POST` | `/api/v1/issues` | Bearer JWT | Project Member or `Admin` | `{ title, description, project, severity, priority, assignee? }` | `201 Created` with issue |
| `GET` | `/api/v1/issues` | Bearer JWT | All | `?project=&status=&priority=&severity=&assignee=&reporter=&search=&sort=&page=&limit=` | `200 OK` `{ data, page, limit, total, totalPages }` |
| `GET` | `/api/v1/issues/:issueId` | Bearer JWT | Project Member or `Admin` | None | `200 OK` single issue details |
| `PATCH` | `/api/v1/issues/:issueId` | Bearer JWT | Project Member or `Admin` | `{ title?, description?, priority?, severity? }` | `200 OK` updated issue |
| `PATCH` | `/api/v1/issues/:issueId/status` | Bearer JWT | Gated by transition map | `{ status }` | `200 OK` updated issue + Activity log |
| `PATCH` | `/api/v1/issues/:issueId/assignee` | Bearer JWT | Project Member or `Admin` | `{ assignee }` (valid member or `null`) | `200 OK` updated issue + Activity log |
| `GET` | `/api/v1/issues/:issueId/activities` | Bearer JWT | Project Member or `Admin` | None | `200 OK` audit activity history array |

### Users
| Method | URL | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/users` | Bearer JWT | All | Directory of system users (`_id`, `name`, `email`, `role`) for member selection |

---

## 3. Status Transition Workflow State Machine

### Centralized Transition Table
| Current Status | Target Status | Allowed Roles | Operational Intent & Rationale |
|---|---|---|---|
| `Open` | `In Progress` | `Admin`, `Developer` | Developers take ownership and start active development. |
| `In Progress` | `Testing` | `Admin`, `Developer` | Developer completes code fix/feature and submits to QA testing. |
| `Testing` | `Resolved` | `Admin`, `Tester` | QA validates the fix in test environment and marks it resolved. |
| `Testing` | `Open` | `Admin`, `Tester` | QA rejects verification and bounces the issue back for remediation. |
| `Resolved` | `Closed` | `Admin`, `Tester` | QA / Admin performs final sign-off and closes ticket. |
| `Resolved` | `Open` | `Admin`, `Tester` | Reopened if regression occurs prior to release closure. |
| `Closed` | `Open` | `Admin` | Exceptional reopen permission reserved strictly for administrators. |

### Error Handling
Any status update not listed above returns `HTTP 400 Bad Request` with an explicit diagnostic message:
```json
{
  "success": false,
  "message": "Cannot transition issue status from \"Open\" to \"Resolved\". Legal next states from \"Open\": In Progress.",
  "errors": []
}
```
If the edge exists but the user's role is unauthorized:
```json
{
  "success": false,
  "message": "Role \"Developer\" is not authorized to transition status from \"Resolved\" to \"Closed\". Permitted roles: Admin, Tester.",
  "errors": []
}
```

---

## 4. Key Business Logic & Ambiguities Resolved

1. **Reporter Server-Side Binding**:
   - `reporter` is NEVER accepted from client input.
   - Forced server-side to `req.user.id` on issue creation. Any spoofed client field is discarded.
2. **Assignee Membership Requirement**:
   - An assignee must exist as a real `User` AND be present in `project.members`.
   - Any attempt to assign a non-member returns `HTTP 422 Unprocessable Entity`.
   - Assignee can be cleared by passing `assignee: null`.
3. **Project Key Format**:
   - 2–10 uppercase alphanumeric characters (`/^[A-Z0-9]{2,10}$/`).
   - Unique across all projects. Duplicate returns `HTTP 409 Conflict`.
   - Immutable once created.
4. **Server-Side Filtering, Pagination & Sorting**:
   - Filter query parameters: `project`, `status`, `priority`, `severity`, `reporter`, `assignee`.
   - Allow-listed sorting: `createdAt`, `-createdAt`, `priority`, `-priority`, `severity`, `-severity`, `status`, `-status`.
   - Hard capped pagination: `page >= 1`, `limit <= 100` (default 20).
5. **Full-Text Search Index**:
   - MongoDB `$text` index created over `title` and `description`.
   - `?search=<term>` executes text scoring search without external dependencies like Elasticsearch.

---

## 5. Database Indexes & Justifications
- `{ project: 1, status: 1 }`: Compound index optimizing the primary view filter pattern (project-scoped status lists).
- `{ title: 'text', description: 'text' }`: Full-text search index for fast keyword matching.
- `{ assignee: 1 }`: Fast lookup for "Assigned to me" dashboard and queries.
- `{ reporter: 1 }`: Index for reporter queries and user profile issue feeds.
- `{ createdAt: -1 }`: Sort index for chronological issue feeds.
- `{ key: 1 } (unique)`: Enforces project key uniqueness.

---

## 6. UI Walkthrough & Breakpoint Verification

### Desktop (>1024px)
- Top bar with status dot, brand mark, and user role badge.
- Sticky left sidebar navigation.
- **Projects Page**: Multi-column grid of project cards with monospace key badges, issue counts, and member counts.
- **Issues Page**: Dense data table with full filter bar, search input, sort selector, and pagination.
- **Issue Detail Page**: Two-column layout with left prose/audit trail and right sticky details console.

### Tablet (640px–1024px)
- Left sidebar collapses to an icon-only rail.
- Issues table hides secondary columns (`Reporter`, `Date`) to prevent horizontal scroll.

### Mobile (<640px)
- Sidebar becomes a slide-in drawer toggled by the hamburger button (`☰`).
- Issues table automatically converts into a stacked card list (`IssueCard`).
- Filter bar moves into a slide-up bottom sheet drawer (`Drawer`) activated by the "Filters •" button.
- Issue detail metadata console stacks above description as a compact 3-column summary block.

---

## 7. Backend Test Suite Results
All 29 integration test cases pass cleanly:
```
PASS tests/project.test.js
  Project API Endpoints (Phase 3)
    POST /api/v1/projects
      ✓ 1. Admin can create project -> 201, auto-adds creating Admin to members
      ✓ 2. Developer or Tester creating project -> 403 Forbidden
      ✓ 3. Duplicate project key -> 409 Conflict with clean message
      ✓ 4. Invalid key format (<2 chars or special chars) -> 422 Validation Error
      ✓ 5. Non-existent member ID in creation -> 422 Unprocessable Entity
    GET /api/v1/projects
      ✓ 1. Admin sees all projects; Developer only sees projects where they are a member
    GET /api/v1/projects/:projectId
      ✓ 1. Non-member receives 403 Forbidden when requesting unauthorized project
      ✓ 2. Member can view project details -> 200
    PATCH /api/v1/projects/:projectId
      ✓ 1. Admin can update project name and members -> 200
      ✓ 2. Non-admin receives 403 on update attempt

PASS tests/issue.test.js
  Issue API Endpoints & Workflow Engine (Phase 3)
    POST /api/v1/issues
      ✓ 1. Creation forces reporter to req.user.id regardless of request body (Decision #1)
      ✓ 2. Assignee must be an active project member (Decision #2) -> 422 if not
      ✓ 3. Creation rejects invalid or non-existent project id
      ✓ 4. Non-member cannot create issue in private project -> 403 Forbidden
    PATCH /api/v1/issues/:issueId/status — State Machine Matrix
      ✓ Row 1: Open -> In Progress allowed for Developer -> 200 & creates Activity
      ✓ Row 2: In Progress -> Testing allowed for Developer -> 200
      ✓ Row 3: Testing -> Resolved allowed for Tester -> 200
      ✓ Row 4: Testing -> Open bounce-back allowed for Tester -> 200
      ✓ Row 5: Resolved -> Closed allowed for Tester -> 200
      ✓ Row 6: Resolved -> Open re-opening allowed for Tester -> 200
      ✓ Row 7: Closed -> Open allowed for Admin only -> 200
      ✓ Invalid 1: Skipping steps (Open -> Resolved) is rejected -> 400
      ✓ Invalid 2: Wrong role (Developer attempting Resolved -> Closed) is rejected -> 400
      ✓ Invalid 3: Transition with no edge (In Progress -> Closed) is rejected -> 400
    PATCH /api/v1/issues/:issueId/assignee
      ✓ Assignee change creates an Activity record
    GET /api/v1/issues — Filtering, Search & Pagination
      ✓ 1. Pagination default: page=1, limit=20, total=25, totalPages=2
      ✓ 2. Filter by status returns only matching docs
      ✓ 3. Filter by severity returns only matching docs
      ✓ 4. Full-text search on title/description returns matches and excludes non-matches

Test Suites: 2 passed, 2 total
Tests:       29 passed, 29 total
```

Regression test suite (`npm run test:all`) also confirmed 100% passing across Phase 1 foundation and Phase 2 auth tests.

---

## 8. Verification Commands
1. **Run Phase 3 Tests**:
   ```powershell
   cd server
   npm run test:phase3
   ```
2. **Run Full Test Suite**:
   ```powershell
   cd server
   npm run test:all
   ```
3. **Build Frontend Bundle**:
   ```powershell
   cd client
   npm run build
   ```
4. **Run Live In-Memory Development Environment**:
   ```powershell
   # Terminal 1: Backend with in-memory MongoDB and seed data
   cd server
   npm run dev:mem

   # Terminal 2: Frontend Vite dev server
   cd client
   npm run dev
   ```

---

## 9. Requirements Covered vs. Remaining

| Scope | Requirement | Status | Phase |
|---|---|---|---|
| Projects | Admin create/update, member assignment | Completed | Phase 3 |
| Projects | Access scoping (user only sees member projects) | Completed | Phase 3 |
| Issues | Title, description, project, priority, severity | Completed | Phase 3 |
| Issues | Server-enforced status workflow state machine | Completed | Phase 3 |
| Issues | Server-side reporter binding & assignee validation | Completed | Phase 3 |
| Issues | Server-side filters, text search, pagination | Completed | Phase 3 |
| UI | "Engineering Console" design system & tokens | Completed | Phase 3 |
| UI | Responsive layouts (desktop table, mobile cards/drawer) | Completed | Phase 3 |
| Activities | Activity audit trail for status & assignee changes | Completed | Phase 3 |
| Comments | Real comment creation and threaded replies | Deferred | **Phase 4** |
| Activities | Full activity timeline across all issue fields | Deferred | **Phase 4** |
| Dashboard | Dashboard metric widgets and "Assigned to me" queries | Deferred | **Phase 4** |
| Kanban | Interactive Drag-and-Drop Kanban Board | Deferred | **Phase 5** |
