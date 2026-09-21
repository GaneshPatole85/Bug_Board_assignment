# BugBoard — Bug & Issue Tracking System

> **Note**: Both frontend and backend utilize a single, centralized `.env` file at the repository root.

[![Build & Test Suite](https://img.shields.io/badge/Tests-246%20Passed-brightgreen)](server/tests)
[![OWASP API Security](https://img.shields.io/badge/OWASP%20API%20Top%2010-100%25%20Compliant-blue)](docs/bug-hunt-log.md)
[![Database](https://img.shields.io/badge/MongoDB%20Atlas-Zero%20Data%20Loss-green)](docs/decisions.md#adr-13-database-location-agnostic-architecture-atlas-local-native-mongo-docker)
[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-blue)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey)](https://expressjs.com)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.9.5-green)](https://mongoosejs.com)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0.7-purple)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED)](docker-compose.yml)

A production-grade, enterprise-ready issue tracking application engineered with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js). Built with rigorous security engineering, strict role-based access control (RBAC), finite state machine workflow engine, server-side filtering/pagination, threaded discussions, real-time activity audit trails, an executive analytics dashboard, a drag-and-drop Kanban board, secure file attachments, email notifications, user profiles, administrative team directory, and zero-data-loss MongoDB Atlas cloud integration.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Sample Login Accounts for Reviewers](#sample-login-accounts-for-reviewers)
- [Postman API Collection](#postman-api-collection)
- [Installation & Quickstart](#installation--quickstart)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Database Design & Indexing Strategy](#database-design--indexing-strategy)
- [Security & OWASP API Top 10 Compliance](#security--owasp-api-top-10-compliance)
- [Bonus Features Implemented](#bonus-features-implemented)
- [User Profiles & Admin User Management](#user-profiles--admin-user-management)
- [Password Management (Self-Service & Reset)](#password-management-self-service--reset)
- [Design Decisions & Architectural Records (ADRs)](#design-decisions--architectural-records-adrs)
- [Automated Testing Suite (246 Tests)](#automated-testing-suite-246-tests)
- [Screenshots & Visual Tour](#screenshots--visual-tour)
- [License](#license)

---

## Project Overview
BugBoard is engineered to solve engineering issue tracking with console-grade precision:
- **Authentication & RBAC**: Strict role boundaries (`Admin`, `Developer`, `Tester`) enforced at the server layer with timing-safe bcrypt authentication, stateless JWTs, and immediate session invalidation on password change or account deactivation.
- **User Profiles & Team Directory**: Self-service profile page for developers/testers with mass-assignment protection; dedicated administrative team directory with role filters, user details editing, and instant account activation/deactivation.
- **Workflow State Machine**: Strictly enforced finite status transitions (`Open` → `In Progress` → `Testing` → `Resolved` → `Closed`) rejecting all illegal edges and unauthorized roles with HTTP 400.
- **Audit & Activity History**: Automated immutable audit logging for titles, priorities, severities, assignments, and status transitions.
- **Executive Dashboard**: Database-side `$facet` aggregation delivering real-time metrics (Total, Open, In Progress, Critical, Resolved) and prioritized developer work queues.
- **Interactive Views**: Dual-view toggle between an indexed data table and a native HTML5 drag-and-drop Kanban board with optimistic updates and automatic server-error rollbacks.
- **File Attachments**: 5MB capped uploads with MIME verification, UUID storage keys, project authorization, and streaming downloads.
- **Cascading Deletions**: Deleting an issue or project automatically cascades cleanup of all child comments, activities, and physical attachment files from disk/storage and MongoDB.
- **Notifications**: In-app notification bell with unread badges and asynchronous fire-and-forget SMTP email dispatch to Mailpit.

---

## Architecture & Tech Stack

### Backend (`server/`)
- **Runtime**: Node.js LTS (v20+) with native ES Modules (`"type": "module"`).
- **Web Framework**: Express.js with versioned RESTful routing (`/api/v1`).
- **Database**: MongoDB (Atlas Cloud Cluster + local fallback) with Mongoose ODM schemas, pre-save hooks, and compound indexes.
- **Logging**: `pino` and `pino-http` structured JSON logging with request ID correlation.
- **Validation**: Declarative `express-validator` middleware envelopes returning standardized 422 errors.
- **Security**: `helmet`, `cors`, `express-rate-limit`, constant-time password comparisons (`bcryptjs`).
- **Email & Storage**: `nodemailer` (SMTP relay to Mailpit) and pluggable local disk / MinIO S3 storage service.

### Frontend (`client/`)
- **Framework**: React 18 with Vite.
- **Routing**: `react-router-dom` with authenticated session guards and role-aware layouts.
- **API Client**: Centralized Axios client (`client.js`) with request authentication interceptors, 401 redirect handling, and blob streaming.
- **Design System**: Vanilla CSS tokens matching `docs/design-system.md` (dark engineering console theme, Inter typography, glassmorphism headers, responsive mobile drawers).

---

## 🔑 Login Credentials for Reviewers & Testing

The application is pre-seeded with live accounts in the MongoDB Atlas database. You can use these credentials to sign in immediately:

| Role | Email | Password | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `gpatole473@gmail.com` | `Password123!` | Full administrative control, project creation & editing, team management, role updates (Developer/Tester only), issue assignment, deletion, and universal workflow overrides. |
| **💻 Developer** | `shastrisujata006@gmail.com` | `Password123!` | Project member, can be assigned issues, transition issue status (`Open` → `In Progress` → `Testing`), post comments, view activities. |
| **🔍 Tester** | `tester@bugboard.test` | `Password123!` | Project member, bug reporter, quality assurance status verification (`Testing` → `Resolved` / `Open`, `Resolved` → `Closed` / `Open`), post comments. |

> [!TIP]
> **⚡ 1-Click Demo Login on UI**:
> When opening `http://localhost:5173/login`, you do not need to type credentials manually. Simply click the **👑 Admin**, **💻 Developer**, or **🔍 Tester** quick-fill buttons at the bottom of the login card. The form auto-populates and the submit button changes to **"Sign in as [Role]"** for instant 1-click access.

---

## Postman API Collection

A complete, production-ready Postman Collection (v2.1.0) is included in the repository:
📁 **[`docs/postmancollection.json`](docs/postmancollection.json)**

### Features:
- **Zero-Setup Variables**: Pre-configured with `{{baseUrl}}` (`http://localhost:5000/api/v1`), `{{adminEmail}}`, `{{devEmail}}`, and `{{testerEmail}}`.
- **Automatic Token Chaining**: Authenticating as Admin, Developer, or Tester automatically captures the JWT into the collection's `{{token}}` variable.
- **Complete Endpoint Coverage**: All 10 API domains covered (Health, Auth, Passwords, Users, Projects, Issues, Comments, Activities, Attachments, Dashboard, Notifications).
- **Import Ready**: Seamlessly import into Postman, Insomnia, or Bruno.

---

## Installation & Quickstart

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/GaneshPatole85/Bug_Board_assignment.git
cd Bug_Board_assignment

# Install root, backend, and frontend dependencies
npm run install:all
```

### 2. Configure Environment (.env)
BugBoard uses a single, centralized `.env` configuration file at the repository root:
```bash
# In repository root
cp .env.example .env
```
*(The repository is already pre-configured to connect to MongoDB Atlas Cloud Cluster with zero manual setup required).*

### 3. Start Development Servers
```bash
# Start both backend API (port 5000) and frontend SPA (port 5173) concurrently:
npm run dev
```

The frontend will be live at `http://localhost:5173` and the backend at `http://localhost:5000`.

### 4. Log In
Open `http://localhost:5173/login` in your browser and choose an account:
- **Admin**: `gpatole473@gmail.com` / `Password123!`
- **Developer**: `shastrisujata006@gmail.com` / `Password123!`
- **Tester**: `tester@bugboard.test` / `Password123!`
*(Or click any of the 1-click demo buttons at the bottom of the card).*

---

## Docker Deployment

BugBoard includes a complete multi-container Docker Compose configuration:
```bash
docker compose up -d --build
```
This orchestrates:
- **MongoDB 7**: `mongodb://localhost:27017`
- **Mailpit SMTP Server**: Port `1025` | **Mailpit Web UI**: `http://localhost:8025`
- **MinIO S3 API**: Port `9000` | **MinIO Console**: `http://localhost:9001`
- **BugBoard Backend API**: `http://localhost:5000`
- **BugBoard Frontend (Nginx SPA)**: `http://localhost:5173`

---

## Environment Variables

| Variable | Scope | Description | Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | Runtime environment | `development` |
| `PORT` | Server | Backend API port | `5000` |
| `API_VERSION` | Server | API version route prefix | `v1` |
| `MONGODB_URI` | Server | MongoDB connection string (supports Atlas, local, or Docker) | `mongodb://127.0.0.1:27017/bugboard` |
| `CLIENT_URL` | Server | Allowed CORS origin | `http://localhost:5173` |
| `JWT_SECRET` | Server | Secret for signing JWT authentication tokens | `bugboard-jwt-secret-key-32-chars-min` |
| `JWT_EXPIRES_IN` | Server | Token lifespan | `1d` |
| `SMTP_HOST` | Server | SMTP host (Mailpit) | `localhost` / `mailpit` |
| `SMTP_PORT` | Server | SMTP port | `1025` |
| `SMTP_FROM` | Server | Outgoing notification address | `no-reply@bugboard.test` |
| `STORAGE_DRIVER` | Server | Storage driver (`local` or `s3`) | `local` |
| `UPLOAD_DIR` | Server | Filesystem directory for uploads | `server/uploads` |
| `VITE_API_BASE_URL`| Client | API endpoint URL | `http://localhost:5000/api/v1` |

---

## Database Design & Indexing Strategy

Detailed architectural rationale and entity diagrams are documented in [`docs/database-design.md`](docs/database-design.md).

### Core Collections
- **User**: Name, unique lowercase email, bcrypt hash, role (`Admin`, `Developer`, `Tester`), sequential role-prefixed `employeeId`, department/designation, phone, avatarUrl, active status, and password tracking dates.
- **Project**: Name, unique uppercase key (regex `^[A-Z0-9-]+$`), description, and an array of `User` ObjectId references representing project members.
- **Issue**: Title, description, project reference, severity (`Low`/`Medium`/`High`/`Critical`), priority (`Low`/`Medium`/`High`/`Urgent`), status (`Open`/`In Progress`/`Testing`/`Resolved`/`Closed`), reporter reference, nullable assignee reference, and timestamps.
- **Comment**: Issue reference, author reference, content (1–2000 chars), and timestamps.
- **Activity**: Issue reference, actor reference, action, modified field, oldValue, newValue, and immutable creation timestamp.
- **Notification**: Recipient reference, actor reference, issue reference, type, title, message, read flag, and timestamps.
- **Attachment**: Issue reference, uploader reference, originalFilename, storageKey (UUID), mimeType, size (max 5MB), and timestamps.
- **Counter**: Atomic sequence tracker (`_id`: `'ADM' | 'DEV' | 'TST'`, `seq`: `Number`) for collision-free employee ID generation.

### Performance Indexes
- `users`: `{ email: 1 }` (Unique), `{ employeeId: 1 }` (Unique, Sparse)
- `projects`: `{ key: 1 }` (Unique)
- `issues`:
  - `{ project: 1 }` (Project tenancy scoping)
  - `{ status: 1 }` (Status filtering & dashboard aggregation)
  - `{ priority: 1 }` (Priority queries)
  - `{ severity: 1 }` (Severity queries)
  - `{ assignee: 1 }` (Personal work queues)
  - `{ createdAt: -1 }` (Chronological pagination)
- `comments`: `{ issue: 1, createdAt: 1 }`
- `activities`: `{ issue: 1, createdAt: -1 }`
- `notifications`: `{ recipient: 1, read: 1, createdAt: -1 }`
- `attachments`: `{ issue: 1, createdAt: -1 }`

---

## Security & OWASP API Top 10 Compliance

BugBoard underwent 5 exhaustive security audit passes ([`docs/bug-hunt-log.md`](docs/bug-hunt-log.md)), resolving 51 edge cases (B01–B51) and neutralizing 4 multi-stage exploit chains:

| OWASP API Top 10 Risk | Enforcement in BugBoard |
|:---|:---|
| **API1: Broken Object Level Authorization (BOLA/IDOR)** | Project tenancy enforced via `authorizeProjectAccess` middleware. Users cannot view, transition, or comment on issues belonging to projects they do not belong to. |
| **API2: Broken Authentication** | Dummy constant-time bcrypt compare on invalid logins prevents timing attacks (B39). Per-request DB status check revokes deactivated tokens immediately (B46). Password changes invalidate in-flight tokens (XF-03). |
| **API3: Broken Object Property Level Auth (BOPLA)** | Mass-assignment guards reject administrative fields (`role`, `isActive`, `employeeId`) on self-service endpoints (422). General issue update rejects direct `status` and `assignee` mutations. |
| **API4: Unrestricted Resource Consumption** | Express rate limiters protect auth and API routes. Strict pagination boundaries (`page >= 1`, `limit: 1..100`). Upload payload capped at 5MB. |
| **API5: Broken Function Level Auth (BFLA)** | Role guards `authorizeRole(['Admin'])` protect project deletion, user management, and team settings. Admin self-edit blanket prohibition enforced (ADR 05). |
| **API6: Unrestricted Business Flow Access** | Finite state machine blocks all 13 illegal non-adjacent transitions. Role permissions verified before moving tickets. |
| **API7: Server-Side Request Forgery (SSRF)** | `avatarUrl` only accepts HTTP/HTTPS schemes; server never fetches or proxies arbitrary user URLs. |
| **API8: Security Misconfiguration** | Helmet enabled with secure CSP, HSTS, noSniff. Stack traces and database connection URIs are suppressed in error envelopes (CH-03). |
| **API9: Improper Inventory Management** | Centralized API versioning under `/api/v1/*`. Catch-all middleware returns structured 404 JSON envelopes. |
| **API10: Unsafe Consumption of APIs & Dependencies** | Defensive try/catch wrapping around SMTP and storage. SMTP downtime operates fire-and-forget; storage upload failures leave 0 orphaned DB records. |

---

## Bonus Features Implemented

1. **Kanban Board with Drag-and-Drop (#1)**:
   - Native HTML5 Drag and Drop moving cards across 5 columns (`Open`, `In Progress`, `Testing`, `Resolved`, `Closed`).
   - Optimistic updates with instant server rollbacks if a transition is disallowed.
   - Screen-reader accessible "Move to..." menu.
2. **Screenshot & File Attachments (#2)**:
   - Multi-part file uploads capped at 5MB with strict MIME allow-list (images, PDF, CSV, logs, text, JSON).
   - Storage keys strictly generated via `crypto.randomUUID()` to prevent path traversal.
   - Authorized blob downloads with RFC 5987 filename preservation.
3. **Activity Timeline (#3)**:
   - Automated timeline for status, priority, severity, title, and assignee mutations.
   - Clear sentence-style descriptions with relative timestamps.
4. **In-App & Email Notifications (#4)**:
   - Real-time notification bell in navigation with unread count badge, interactive dropdown, and mark-read controls.
   - Fire-and-forget SMTP email dispatch to Mailpit.
5. **Pagination & Multi-Field Sorting (#5)**:
   - Server-side indexed offset pagination (`page`, `limit`).
   - Multi-column sorting by creation date, priority, severity, and status.
6. **Comprehensive Automated Test Suite (#6)**:
   - 246 passing tests across 9 test suites covering security, workflows, boundary fuzzing, and bonus features.
7. **Docker Compose Setup (#7)**:
   - Multi-container stack orchestrating MongoDB, Mailpit, MinIO, Node API, and Nginx SPA client.

---

## User Profiles & Admin User Management

1. **Self-Service Profiles (`/profile`)**:
   - Displays name, email, employee ID, designation, phone number, and avatar URL.
   - Developers and Testers can update contact details (`name`, `phone`, `avatarUrl`).
   - Mass-assignment guard rejects attempts to edit administrative fields (`employeeId`, `role`, `isActive`, `department`) with 422.
2. **Admin User Directory (`/team`)**:
   - Role-gated directory accessible exclusively to Administrators.
   - Filter by role (`All roles`, `Developers`, `Testers`, `Admins`) and search across names, emails, and employee IDs.
   - Role reassignment strictly restricted to `Developer` and `Tester` (ADR 14) to maintain sole primary administrator security.
3. **Instant Account Activation & Deactivation**:
   - Administrators can activate or deactivate Developer and Tester accounts.
   - **Immediate Session Cutoff**: The `authenticate` middleware checks account status on every request; deactivated tokens are instantly rejected with `401 Unauthorized`.
   - **Assignee Integrity**: Deactivated users cannot be assigned to new or existing issues (422 rejection).

---

## Password Management (Self-Service & Reset)

1. **Change Password (Self-Service)**:
   - Authenticated users update their password via `PATCH /api/v1/auth/change-password`.
   - Validates current password, enforces minimum 8 characters, and confirms match.
   - Sets `passwordChangedAt` timestamp, immediately invalidating all active sessions across other tabs/devices.
2. **Forgot Password (Reset Link)**:
   - Logged-out users submit email via `POST /api/v1/auth/forgot-password`.
   - Returns identical generic response to prevent user enumeration.
   - Generates a 256-bit cryptographically secure token, hashes it with SHA-256 for database storage with 30-minute expiry, and dispatches reset email.
3. **Reset Password (Token Consumption)**:
   - User consumes link at `/reset-password?token=...`.
   - Verifies token hash, ensures account is active (B49), updates password hash, clears token, and updates `passwordChangedAt`.

---

## Design Decisions & Architectural Records (ADRs)

Documented in detail in [`docs/decisions.md`](docs/decisions.md):
- **ADR 01**: Client-Side Token Storage (`localStorage` vs. `httpOnly` Cookies)
- **ADR 02**: Stateless JWT Architecture with Real-Time Database Revocation
- **ADR 03**: Profile Field Editability Split (Self-Service vs. Administrative Control)
- **ADR 04**: Immediate Token Cutoff for Deactivated Users via Lightweight Middleware DB Check
- **ADR 05**: Admin Blanket Self-Edit Prohibition on Administrative Endpoint
- **ADR 06**: System-Generated Atomic Counter for Employee Identifiers (`employeeId`) & Immutability
- **ADR 07**: Active-Status Guard on Issue Lifecycle and Assignment
- **ADR 08**: Project Membership Inactive State Handling & Historical Integrity
- **ADR 09**: Subsuming Narrow Checks into Clean Architectural Guards
- **ADR 10**: Timing Side-Channel Elimination via Constant-Time Dummy Bcrypt Compare
- **ADR 11**: Cryptographically Secure Single-Use Reset Token Lifecycle with SHA-256 Hashing
- **ADR 12**: 422 Unprocessable Entity Selection for Change Password Failures
- **ADR 13**: Database-Location-Agnostic Architecture (Atlas, Local Mongo, Docker)
- **ADR 14**: Sole Primary Administrator Architecture & Non-Escalation Rule
- **ADR 15**: Cascading Resource Cleanup Across Deletions (Issues & Projects)

---

## Automated Testing Suite (246 Tests)

BugBoard maintains **246 automated tests passing with 100% success rate**:

```bash
# Foundation & Schema Tests
npm run test --prefix server

# Authentication & RBAC Tests (12 tests)
npm run test:auth --prefix server

# Change Password & Forgot/Reset Password Tests (14 tests)
npm run test:password --prefix server

# Projects & Issues Tests (39 tests)
npm run test:phase3 --prefix server

# Comments, Activities & Dashboard Tests (11 tests)
npm run test:phase4 --prefix server

# Bonus Features Tests (Kanban, Attachments, Notifications) (14 tests)
npm run test:bonus --prefix server

# User Profiles & Admin User Management Tests (16 tests)
npm run test:users --prefix server

# Deep Bug Hunt Suite (129 tests)
npm run test:hunt --prefix server

# Super Deep Cross-Feature & Chaos Suite (28 tests)
npm run test:super-deep --prefix server

# Run all test suites in sequence
npm run test:all --prefix server
```

---

## Screenshots & Visual Tour

*(Reviewers can verify all screens live by launching dev servers or running Docker Compose)*

- **Dashboard**: Executive engineering console with status metrics, critical bug alerts, and prioritized personal work queues.
- **Projects Console**: Team member rosters, project key identifiers, and role-gated administration.
- **Issue Tracker (Table View)**: Server-side query parameter filtering by project, status, priority, severity, assignee, and reporter.
- **Kanban Board**: Drag-and-drop workflow lanes with optimistic state updates.
- **Issue Detail Console**: Markdown descriptions, status transitions, attachments dropzone, threaded comments, and activity audit timeline.
- **Team Directory**: Administrative roster with employee IDs, role filters, user details editing, and instant account deactivation.
- **User Profile**: Self-service contact information editing with employee badge and account status indicator.
- **Notification Center**: Navigation bell dropdown displaying relative timestamps and unread counters.

---

## License
MIT License. Created for the MERN Stack Technical Assessment.
