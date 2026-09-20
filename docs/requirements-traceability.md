# BugBoard — Requirements Traceability Matrix

This document maps all assignment requirements across Phases 1 through 4 directly to their implementation files, test suites, and documentation.

## 1. Authentication & Role-Based Access Control (RBAC)

| Requirement | Implementation Files | Test Suite | Docs Reference |
|---|---|---|---|
| User registration (Developer / Tester) | `server/src/controllers/auth.controller.js`, `server/src/services/auth.service.js` | `server/tests/auth.test.js` | `docs/api-documentation.md` |
| Admin privileged account protection | `server/src/validators/auth.validators.js`, `server/src/middlewares/rbac.js` | `server/tests/auth.test.js` | `docs/architecture.md` |
| Password hashing (bcrypt cost factor 12) | `server/src/models/User.js` | `server/tests/foundation.test.js` | `docs/database-design.md` |
| JWT issuance & token verification | `server/src/utils/jwt.js`, `server/src/middlewares/authenticate.js` | `server/tests/auth.test.js` | `docs/api-documentation.md` |
| Frontend Auth Context & Route Guards | `client/src/context/AuthContext.jsx`, `client/src/components/ProtectedRoute.jsx` | Client build verification | `docs/design-system.md` |

---

## 2. Project Management

| Requirement | Implementation Files | Test Suite | Docs Reference |
|---|---|---|---|
| Project CRUD operations | `server/src/controllers/project.controller.js`, `server/src/services/project.service.js` | `server/tests/project.test.js` | `docs/api-documentation.md` |
| Unique Project Key validation (`[A-Z0-9]+`) | `server/src/models/Project.js`, `server/src/validators/project.validators.js` | `server/tests/project.test.js` | `docs/database-design.md` |
| Project team member management | `server/src/services/project.service.js` (`addMember`, `removeMember`) | `server/tests/project.test.js` | `docs/phase-03-projects-issues.md` |
| Project-scoped authorization | `server/src/services/project.service.js` | `server/tests/project.test.js` | `docs/phase-03-projects-issues.md` |
| Project UI & Members Modal | `client/src/pages/ProjectsPage.jsx`, `client/src/components/ProjectMembersModal.jsx` | Client build verification | `docs/phase-03-projects-issues.md` |

---

## 3. Issue & Bug Tracking Workflow

| Requirement | Implementation Files | Test Suite | Docs Reference |
|---|---|---|---|
| Issue CRUD operations | `server/src/controllers/issue.controller.js`, `server/src/services/issue.service.js` | `server/tests/issue.test.js` | `docs/api-documentation.md` |
| Reporter anti-spoofing (`req.user.id`) | `server/src/services/issue.service.js` (`createIssue`) | `server/tests/issue.test.js` | `docs/phase-03-projects-issues.md` |
| Developer-only assignment constraint | `server/src/services/issue.service.js` (`updateIssueAssignee`) | `server/tests/issue.test.js` | `docs/phase-03-projects-issues.md` |
| Status transition state machine | `server/src/constants/issueWorkflow.js`, `server/src/services/issue.service.js` | `server/tests/issue.test.js` | `docs/phase-03-projects-issues.md` |
| Server-side filtering, search & pagination | `server/src/services/issue.service.js` (`listIssues`) | `server/tests/issue.test.js` | `docs/api-documentation.md` |
| Issue List & Detail Console | `client/src/pages/IssuesPage.jsx`, `client/src/pages/IssueDetailPage.jsx` | Client build verification | `docs/design-system.md` |

---

## 4. Discussion & Comments (Phase 4)

| Requirement | Implementation Files | Test Suite | Docs Reference |
|---|---|---|---|
| Add comment to bug | `server/src/controllers/comment.controller.js`, `server/src/services/comment.service.js` | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Author anti-spoofing via `req.user.id` | `server/src/services/comment.service.js` (`createComment`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Project-level comment authorization | `server/src/services/comment.service.js` (`_verifyIssueAndProjectAccess`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Chronological (oldest-first) listing | `server/src/services/comment.service.js` (`listComments`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Comment input UI with character counter | `client/src/components/CommentForm.jsx`, `client/src/components/CommentForm.css` | Client build verification | `docs/phase-04-dashboard-comments-activity.md` |
| Threaded discussion display | `client/src/components/CommentList.jsx`, `client/src/components/CommentList.css` | Client build verification | `docs/phase-04-dashboard-comments-activity.md` |

---

## 5. Activity & Audit History (Phase 4)

| Requirement | Implementation Files | Test Suite | Docs Reference |
|---|---|---|---|
| Granular change logging (title, priority, severity) | `server/src/services/issue.service.js` (`updateIssue`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Description exclusion from activity trail | `server/src/services/issue.service.js` (`updateIssue`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Status change activity tracking | `server/src/services/issue.service.js` (`updateIssueStatus`) | `server/tests/issue.test.js`, `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Reassignment activity tracking | `server/src/services/issue.service.js` (`updateIssueAssignee`) | `server/tests/issue.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Sentence-style timeline rendering | `client/src/components/ActivityTimeline.jsx`, `client/src/components/ActivityTimeline.css` | Client build verification | `docs/phase-04-dashboard-comments-activity.md` |

---

## 6. Dashboard Analytics (Phase 4)

| Requirement | Implementation Files | Test Suite | Docs Reference |
|---|---|---|---|
| Single-roundtrip `$facet` aggregation | `server/src/services/dashboard.service.js` (`getDashboardSummary`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Totals: total, open, in-progress, critical, resolved | `server/src/services/dashboard.service.js` (`getDashboardSummary`) | `server/tests/phase4.test.js` | `docs/api-documentation.md` |
| Role-scoped visibility (Admin vs Non-Admin) | `server/src/services/dashboard.service.js` | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Priority-sorted personal work queue | `server/src/services/dashboard.service.js` (`assignedToMe`) | `server/tests/phase4.test.js` | `docs/phase-04-dashboard-comments-activity.md` |
| Engineering Console Dashboard UI | `client/src/pages/DashboardPage.jsx`, `client/src/pages/DashboardPage.css` | Client build verification | `docs/phase-04-dashboard-comments-activity.md` |
