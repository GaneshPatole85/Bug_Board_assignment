# BugBoard — Complete Requirements Traceability Matrix

This matrix maps every verbatim requirement from the BugBoard assignment specification to its implementation files, API routes, UI components, automated test suites, and final verified status.

---

## 1. General Technical Requirements

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **GT-01** | React.js frontend, Node.js + Express.js backend | 1 | `client/package.json`, `server/package.json`, `server/src/server.js` | N/A | App Shell | `npm run test` | **Met** |
| **GT-02** | MongoDB with Mongoose for persistence and schema design | 1 | `server/src/models/*.js`, `server/src/config/db.js` | N/A | N/A | `tests/foundation.test.js` | **Met** |
| **GT-03** | RESTful APIs with meaningful routes and correct HTTP status codes | 1–4 | `server/src/routes/*.js`, `server/src/controllers/*.js` | `/api/v1/*` | `apiClient` | `tests/api.test.js`, `tests/deep-hunt.test.js` | **Met** |
| **GT-04** | Frontend and backend organized into clear folders/modules | 1 | `server/src/{controllers,models,routes,services,validators}`, `client/src/{components,pages,hooks,context}` | N/A | Directory Structure | Static Code Review | **Met** |
| **GT-05** | Environment variables used for secrets/config; `.env` never committed | 1 | `.env.example`, `server/src/config/index.js`, `.gitignore` | N/A | N/A | Git History Audit | **Met** |
| **GT-06** | Input validation and useful error responses implemented | 1–4 | `server/src/validators/*.js`, `server/src/middlewares/errorHandler.js` | All endpoints | Error Toast / Inline Alerts | `tests/deep-hunt.test.js` (B22–B32) | **Met** |
| **GT-07** | Loading, empty, and error states present in the UI where appropriate | 1–4 | `client/src/components/ui/{EmptyState,SkeletonRow}.jsx`, `ToastContext.jsx` | N/A | Table & Card views | Frontend Build & Live UI | **Met** |
| **GT-08** | Responsive UI that works on desktop and mobile screens | 1–4 | `client/src/layouts/MainLayout.jsx`, CSS media queries (`@media (max-width: 768px)`) | N/A | Responsive Layout Drawer & Tables | Visual & Responsive Testing | **Met** |
| **GT-09** | Clear README with prerequisites, installation steps, env vars, run commands | 1–5 | `README.md` | N/A | Documentation | Verification Audit | **Met** |

---

## 2. Authentication & Roles

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **A-01** | Register/login users using secure password hashing and JWT | 2 | `server/src/services/auth.service.js`, `server/src/utils/jwt.js` | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | `LoginPage.jsx`, `RegisterPage.jsx` | `tests/auth.test.js` | **Met** |
| **A-02** | Support at least three roles: Admin, Developer, Tester | 2 | `server/src/constants/roles.js`, `server/src/models/User.js` | N/A | Role Badges | `tests/auth.test.js` | **Met** |
| **A-03** | Enforce permissions on the backend, not only by hiding UI controls | 2–3 | `server/src/middlewares/rbac.js`, `server/src/services/project.service.js`, `issue.service.js` | All protected routes | RBAC-guarded buttons | `tests/auth.test.js`, `tests/deep-hunt.test.js` (B20, B33, B34) | **Met** |

---

## 3. Project Management

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **B-01** | Admin can create, update, and view projects | 3 | `server/src/controllers/project.controller.js`, `server/src/services/project.service.js` | `POST`, `PATCH`, `GET /api/v1/projects` | `ProjectsPage.jsx`, `ProjectForm.jsx` | `tests/project.test.js` | **Met** |
| **B-02** | Project includes name, key/code, description, and members | 1, 3 | `server/src/models/Project.js`, `server/src/validators/project.validators.js` | `/api/v1/projects` | `ProjectForm.jsx`, `ProjectMembersModal.jsx` | `tests/project.test.js` | **Met** |
| **B-03** | Users only see projects they're allowed to access | 3 | `server/src/services/project.service.js` (`listProjects`) | `GET /api/v1/projects` | `ProjectsPage.jsx` | `tests/project.test.js`, `tests/deep-hunt.test.js` (B34, B38) | **Met** |

---

## 4. Bug / Issue Management

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **C-01** | Create a bug with title and detailed description | 3 | `server/src/controllers/issue.controller.js`, `server/src/services/issue.service.js` | `POST /api/v1/issues` | `IssueForm.jsx` | `tests/issue.test.js` | **Met** |
| **C-02** | Fields include project, severity, priority, status, reporter, assignee | 1, 3 | `server/src/models/Issue.js`, `server/src/validators/issue.validators.js` | `/api/v1/issues` | `IssueForm.jsx`, `IssueDetailPage.jsx` | `tests/issue.test.js` | **Met** |
| **C-03** | Suggested severity: Low, Medium, High, Critical | 1, 3 | `server/src/constants/issueWorkflow.js` (`SEVERITIES`) | `/api/v1/issues` | Severity badges / dropdown | `tests/issue.test.js` | **Met** |
| **C-04** | Suggested priority: Low, Medium, High, Urgent | 1, 3 | `server/src/constants/issueWorkflow.js` (`PRIORITIES`) | `/api/v1/issues` | Priority badges / dropdown | `tests/issue.test.js` | **Met** |
| **C-05** | Workflow: Open → In Progress → Testing → Resolved → Closed | 3 | `server/src/constants/issueWorkflow.js` (`STATUS_WORKFLOW`) | `PATCH /api/v1/issues/:id/status` | Workflow action buttons & Kanban | `tests/issue.test.js`, `tests/deep-hunt.test.js` (B19, B20) | **Met** |
| **C-06** | Allow issue update, reassignment, and status change according to role/access | 3 | `server/src/services/issue.service.js` (`updateIssue`, `updateIssueStatus`, `updateIssueAssignee`) | `PATCH /issues/:id`, `PATCH /status`, `PATCH /assignee` | `IssueDetailPage.jsx`, `KanbanBoard.jsx` | `tests/issue.test.js`, `tests/bonus.test.js` | **Met** |
| **C-07** | Created/updated timestamps displayed | 1–3 | `server/src/models/Issue.js` (`timestamps: true`) | `/api/v1/issues` | `IssueRow.jsx`, `IssueDetailPage.jsx` | `tests/issue.test.js` | **Met** |
| **C-08** | Search and filter by project, status, priority, severity, reporter, or assignee | 3, Audit | `server/src/services/issue.service.js`, `client/src/components/IssueFilters.jsx`, `IssuesPage.jsx` | `GET /api/v1/issues?project=&status=&priority=&severity=&assignee=&reporter=&search=` | `IssueFilters.jsx`, `IssuesPage.jsx` (Toolbar & Filter Drawer) | `tests/issue.test.js`, Live Verification Script | **Met** |

---

## 5. Comments & Activity

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **D-01** | Users can add comments to a bug | 4 | `server/src/controllers/comment.controller.js`, `server/src/services/comment.service.js` | `POST /api/v1/issues/:id/comments` | `CommentForm.jsx` | `tests/phase4.test.js` | **Met** |
| **D-02** | Show author and timestamp for each comment | 4 | `server/src/models/Comment.js`, `client/src/components/CommentList.jsx` | `GET /api/v1/issues/:id/comments` | `CommentList.jsx` | `tests/phase4.test.js` | **Met** |
| **D-03** | Maintain basic activity/history for important changes (status, assignee, title, priority, severity) | 4 | `server/src/models/Activity.js`, `server/src/services/issue.service.js` | `GET /api/v1/issues/:id/activity` | `ActivityTimeline.jsx` | `tests/phase4.test.js` | **Met** |

---

## 6. Dashboard

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **E-01** | Show total, open, in-progress, critical, and resolved issues | 4 | `server/src/services/dashboard.service.js` (`$facet` pipeline) | `GET /api/v1/dashboard/summary` | `DashboardPage.jsx` Stat Cards | `tests/phase4.test.js` | **Met** |
| **E-02** | Show issues assigned to the logged-in developer | 4 | `server/src/services/dashboard.service.js` (`assignedToMe` queue) | `GET /api/v1/dashboard/summary` | `DashboardPage.jsx` "Assigned to Me" Table | `tests/phase4.test.js` | **Met** |
| **E-03** | Include useful quick filters or a simple board/table view | 4–5 | `client/src/pages/DashboardPage.jsx`, `client/src/pages/IssuesPage.jsx` | Query filters | Stat cards clickable navigation + Table/Board switcher | Live Verification | **Met** |

---

## 7. Business Logic Expectations

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **BL-01** | Role and project access validated on the server | 2–4 | `server/src/middlewares/rbac.js`, `server/src/services/*.service.js` | All endpoints | Server-enforced | `tests/auth.test.js`, `tests/deep-hunt.test.js` | **Met** |
| **BL-02** | Invalid status transitions rejected or intentionally handled | 3 | `server/src/constants/issueWorkflow.js`, `server/src/services/issue.service.js` | `PATCH /issues/:id/status` | Alert banners & rollback | `tests/issue.test.js`, `tests/deep-hunt.test.js` (B19, B20), `tests/bonus.test.js` | **Met** |
| **BL-03** | An issue must belong to a valid project and reporter | 3 | `server/src/models/Issue.js`, `server/src/services/issue.service.js` | `POST /issues` | Form Select | `tests/issue.test.js`, `tests/deep-hunt.test.js` (B27) | **Met** |
| **BL-04** | Assignees are valid project members or follow a clearly documented rule | 3 | `server/src/validators/issue.validators.js`, `server/src/services/issue.service.js` | `POST /issues`, `PATCH /issues/:id/assignee` | Member-scoped select | `tests/issue.test.js`, `tests/deep-hunt.test.js` (B21) | **Met** |
| **BL-05** | Filtering performed efficiently through API query parameters where possible | 3 | `server/src/services/issue.service.js` (`listIssues` MongoDB query builder) | `GET /api/v1/issues` | `IssueFilters.jsx` | `tests/issue.test.js`, `tests/deep-hunt.test.js` (B25, B26) | **Met** |

---

## 8. Bonus Features

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **BF-01** | Kanban board with drag-and-drop status changes | Bonus | `client/src/components/KanbanBoard.jsx`, `KanbanBoard.css` | `PATCH /api/v1/issues/:id/status` | `[Table] [Board]` switcher, 5 columns | `tests/bonus.test.js` | **Met** |
| **BF-02** | Screenshot/file attachments | Bonus | `server/src/models/Attachment.js`, `server/src/services/{attachment,storage}.service.js`, `AttachmentSection.jsx` | `POST /issues/:id/attachments`, `GET /download` | Drag-drop dropzone, file list, download button | `tests/bonus.test.js` | **Met** |
| **BF-03** | Activity timeline showing field changes | 4 | `server/src/models/Activity.js`, `client/src/components/ActivityTimeline.jsx` | `GET /api/v1/issues/:id/activity` | Sentence-style timeline | `tests/phase4.test.js` | **Met** |
| **BF-04** | Email/in-app notifications for assignment or status changes | Bonus | `server/src/models/Notification.js`, `server/src/services/notification.service.js`, `NotificationBell.jsx` | `GET /notifications`, `PATCH /read` | Notification Bell with unread counter | `tests/bonus.test.js` | **Met** |
| **BF-05** | Pagination and sorting | 3, Bonus | `server/src/services/issue.service.js`, `Pagination.jsx` | `GET /api/v1/issues?page=&limit=&sort=` | Pagination bar, Sort dropdown | `tests/deep-hunt.test.js` (B23) | **Met** |
| **BF-06** | Automated API/component tests | 1–5 | `server/tests/*.test.js` (8 test suites, 191 tests) | N/A | N/A | Jest test runner | **Met** |
| **BF-07** | Docker setup or deployed demo | Bonus | `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf` | Port 5000, 5173, 1025, 8025, 9000 | Full Stack Containerization | Docker build verification | **Met** |

---

## 9. Data Models / Documentation

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **DM-01** | Important relationships and indexing decisions explained in README | 1–5 | `README.md`, `docs/database-design.md` | N/A | Documentation | Verification Audit | **Met** |

---

## 10. Submission Requirements

| ID | Requirement | Phase | Implementation Files / Evidence | Status |
|:---|:---|:---|:---|:---|
| **SR-01** | Repository must be accessible to the reviewer | Submission | Reminder for human to confirm public visibility or collaborator invite on GitHub. | **Manual-Only** |
| **SR-02** | README contains project overview, setup steps, env vars, and sample login details | 1–5 | `README.md` sections verified with exact credentials (`admin@bugboard.test`, etc.). | **Met** |
| **SR-03** | `node_modules`, secrets, private keys, real credentials are not committed | 1–5 | Checked `.gitignore` rules (`.env*`, `node_modules/`, `server/uploads/*`) and audited complete git log history. | **Met** |
| **SR-04** | Screenshots or a short demo GIF/video link included | Submission | `README.md` visual tour documented; human reminder to capture final video walkthrough if desired. | **Manual-Only** |
| **SR-05** | README has a section on important design decisions and known limitations | 1–5 | `README.md` ("Design Decisions & Known Limitations") covers all architectural decisions. | **Met** |
| **SR-06** | The codebase must be genuinely explainable — flag any undocumented code | 1–5 | Full architecture, data flow, API specs, and JSDoc annotations verified across all packages. | **Met** |

---

## 11. User Profiles & Admin User Management (New Feature)

| ID | Requirement | Phase | Implementation Files | API Route | UI Component | Test Suite | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **UP-01** | User Profile with name, employee ID, designation, phone, avatar URL, active status | 6 | `server/src/models/User.js` | `GET /api/v1/users/me`, `GET /api/v1/users` | `ProfilePage.jsx`, `TeamPage.jsx` | `tests/user-management.test.js` | **Met** |
| **UP-02** | Developers & Testers can view and update their own basic information | 6 | `server/src/services/user.service.js` (`updateSelfProfile`), `user.validators.js` | `PATCH /api/v1/users/me` | `ProfilePage.jsx` | `tests/user-management.test.js` | **Met** |
| **UP-03** | Mass-assignment guard: self-update rejects administrative fields (422) | 6 | `server/src/validators/user.validators.js` (`validateSelfProfileUpdate`) | `PATCH /api/v1/users/me` | `ProfilePage.jsx` form | `tests/user-management.test.js` | **Met** |
| **UP-04** | Admin can view all Developers and Testers in one place (user directory) | 6 | `server/src/services/user.service.js` (`listUsers`), `TeamPage.jsx` | `GET /api/v1/users?role=` | `TeamPage.jsx` (Role filter tabs, search, responsive cards) | `tests/user-management.test.js` | **Met** |
| **UP-05** | Admin can activate or deactivate Developer or Tester accounts | 6 | `server/src/services/user.service.js` (`updateUserAsAdmin`) | `PATCH /api/v1/users/:userId` | `TeamPage.jsx` (Status toggle, confirm modal) | `tests/user-management.test.js` | **Met** |
| **UP-06** | Admin blanket self-edit guard: cannot edit or deactivate own record via admin endpoint (403) | 6 | `server/src/services/user.service.js` (`updateUserAsAdmin`) | `PATCH /api/v1/users/:userId` | `TeamPage.jsx` (Disabled self-edit and self-deactivate) | `tests/user-management.test.js` | **Met** |
| **UP-07** | Immediate session revocation upon account deactivation (401 Unauthorized) | 6 | `server/src/middlewares/authenticate.js` (Per-request DB status lookup) | All authenticated routes | Immediate logout / session banner | `tests/user-management.test.js` | **Met** |
| **UP-08** | Inactive user login blocked with specific message (401) | 6 | `server/src/services/auth.service.js` (`login`) | `POST /api/v1/auth/login` | `LoginPage.jsx` alert banner | `tests/user-management.test.js` | **Met** |
| **UP-09** | Extended assignee validation: cannot assign issues to inactive users (422) | 6 | `server/src/services/issue.service.js` (`createIssue`, `updateIssueAssignee`) | `POST /issues`, `PATCH /issues/:id/assignee` | `IssueForm.jsx` dropdown | `tests/user-management.test.js` | **Met** |
| **UP-10** | Project member roster tags inactive users without deleting history | 6 | `client/src/components/ProjectMembersModal.jsx`, `ProjectForm.jsx` | `GET /api/v1/projects/:id` | Member roster inactive badge | `npm run build` | **Met** |
