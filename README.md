# BugBoard — Bug & Issue Tracking System

[![Build & Test Suite](https://img.shields.io/badge/Tests-204%20Passed-brightgreen)](server/tests)
[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-blue)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey)](https://expressjs.com)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.9.5-green)](https://mongoosejs.com)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0.7-purple)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED)](docker-compose.yml)

A production-grade, full-stack issue tracking application engineered with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js), featuring strict role-based access control (RBAC), an auditable status workflow engine, server-side filtering/pagination, threaded discussions, real-time activity trails, an executive analytics dashboard, a drag-and-drop Kanban board, secure file attachments, email notifications, user profiles, and administrative user management.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Quickstart](#installation--quickstart)
- [Docker Deployment](#docker-deployment)
- [Sample Login Accounts for Reviewers](#sample-login-accounts-for-reviewers)
- [Environment Variables](#environment-variables)
- [Database Design & Indexing Strategy](#database-design--indexing-strategy)
- [Bonus Features Implemented](#bonus-features-implemented)
- [User Profiles & Admin User Management](#user-profiles--admin-user-management)
- [Design Decisions & Known Limitations](#design-decisions--known-limitations)
- [Automated Testing Suite](#automated-testing-suite)
- [Screenshots & Visual Tour](#screenshots--visual-tour)
- [License](#license)

---

## Project Overview
BugBoard is built to solve team issue tracking with engineering console precision:
- **Authentication & RBAC**: Strict role boundaries (`Admin`, `Developer`, `Tester`) enforced at the server layer with timing-safe bcrypt authentication and stateless JWTs.
- **User Profiles & Team Directory**: Self-service profile page for developers/testers with mass-assignment protection; dedicated administrative team directory with role filters, user details editing, and instant account deactivation.
- **Immediate Session Cutoff**: Account deactivation immediately revokes active unexpired JWTs and prevents issue assignment to inactive personnel.
- **Project Workspaces**: Projects with unique keys (e.g. `BUG`, `CORE`), descriptions, and team membership scoping.
- **Workflow State Machine**: Strictly enforced status transitions (`Open` → `In Progress` → `Testing` → `Resolved` → `Closed`) preventing illegal skips or role violations.
- **Audit & Activity History**: Automated immutable change logging for titles, priorities, severities, assignments, and status transitions.
- **Executive Dashboard**: Database-side `$facet` aggregation delivering real-time metrics (Total, Open, In Progress, Critical, Resolved) and prioritized developer work queues.
- **Interactive Views**: Dual-view toggle between an indexed table view and a native HTML5 drag-and-drop Kanban board with automatic rollbacks.
- **File Attachments**: 5MB capped uploads with MIME verification, UUID storage keys, project authorization, and streaming downloads.
- **Notifications**: In-app notification bell with unread badges and asynchronous fire-and-forget SMTP email dispatch to Mailpit.

---

## Architecture & Tech Stack

### Backend (`server/`)
- **Runtime**: Node.js LTS (v20+) with native ES Modules (`"type": "module"`).
- **Web Framework**: Express.js with versioned RESTful routing (`/api/v1`).
- **Database**: MongoDB with Mongoose ODM schemas, pre-save middleware, and compound indexes.
- **Logging**: `pino` and `pino-http` structured JSON logging with request ID correlation.
- **Validation**: Declarative `express-validator` middleware envelopes returning standardized 422 errors.
- **Security**: `helmet`, `cors`, `express-rate-limit`, constant-time password comparisons.
- **Email & Storage**: `nodemailer` (SMTP relay to Mailpit) and pluggable local disk / MinIO S3 storage service.

### Frontend (`client/`)
- **Framework**: React 18 with Vite.
- **Routing**: `react-router-dom` with authenticated session guards and role-aware layouts.
- **API Client**: Centralized Axios client (`client.js`) with request authentication interceptors, 401 redirect handling, and blob streaming.
- **Design System**: Vanilla CSS tokens matching `docs/design-system.md` (dark engineering console theme, Inter typography, glassmorphism headers, mobile drawer navigation).

---

## Prerequisites
- **Node.js**: `v20.0.0` or higher.
- **npm**: `v10.0.0` or higher.
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/bugboard`) OR Docker.

---

## Installation & Quickstart

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd bugboard

# Install root, backend, and frontend dependencies
npm run install:all
```

### 2. Configure Environment Files
```bash
# In repository root
cp .env.example .env

# In server directory
cp server/.env.example server/.env

# In client directory
cp client/.env.example client/.env
```

### 3. Start Development Servers

#### Option A: Instant Zero-Dependency Mode (In-Memory MongoDB)
```bash
# Terminal 1: Backend with automatic in-memory MongoDB and seeded demo accounts
npm run dev:mem --prefix server

# Terminal 2: Frontend client
npm run dev --prefix client
```

#### Option B: Standard Mode (Local MongoDB)
```bash
# Seed local database
npm run seed --prefix server

# Run backend and frontend concurrently
npm run dev
```

#### Option C: Cloud Database Mode (MongoDB Atlas)
BugBoard connects seamlessly to MongoDB Atlas with zero application code changes:
1. In `server/.env`, set `MONGODB_URI` to your Atlas connection string:
   ```bash
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/bugboard?retryWrites=true&w=majority&appName=Cluster0
   ```
   *(Ensure your current IP is allow-listed in the Atlas Network Access panel).*
2. Start the server and client:
   ```bash
   npm run dev
   ```

> **Security Note**: Always treat Atlas connection strings as confidential secrets. Store them strictly in `server/.env` (which is gitignored) and never commit real credentials to source control.

The frontend will be live at `http://localhost:5173` and the backend at `http://localhost:5000`.

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

## Sample Login Accounts for Reviewers

The database seeds initial test users for all three roles:

| Role | Email | Password | Employee ID | Designation | Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@bugboard.test` | `Password123!` | `ADM-0001` | `Platform Administrator` | Universal project access, project creation & editing, universal status override |
| **Developer** | `dev@bugboard.test` | `Password123!` | `DEV-0001` | `Principal Engineer` | Issue assignment, status workflow (`Open` → `In Progress`, `Testing` → `Open`), comments |
| **Tester** | `tester@bugboard.test` | `Password123!` | `TST-0001` | `Senior QA Specialist` | Bug reporting, QA verification (`Testing` → `Resolved`), comments |

### Changing the Seeded Admin's Identity
By system architectural design (ADR 05 & ADR 06), organizational fields (`employeeId`, `designation`) cannot be assigned via any in-app self-edit action, even by an Administrator.
- **Admin Email & Password**: Defined in `server/src/utils/seed.js` under `SEED_ACCOUNTS`.
- **Employee ID**: Deterministically assigned as `ADM-0001` via the system atomic counter.
- **Designation**: Defaults to `"Platform Administrator"`.
- **To deliberately update the seeded Admin's identity**:
  1. Open `server/src/utils/seed.js`.
  2. Edit the desired fields (e.g. `name`, `email`, `designation`) in `SEED_ACCOUNTS`.
  3. Re-run the idempotent seed script: `npm run seed --prefix server`.
  The seed script automatically updates the existing Administrator document in place without creating duplicates or disrupting data integrity.

### Backfill Migration for Employee IDs
If migrating an existing database where legacy user records lack an `employeeId`, run the idempotent backfill migration:
```bash
npm run migrate:employee-ids --prefix server
```
This inspects all user documents missing an `employeeId`, generates sequential role-prefixed IDs (`ADM-XXXX`, `DEV-XXXX`, `TST-XXXX`) ordered by account `createdAt` timestamp, and commits them. Running the migration a second time safely detects zero unassigned records and makes zero modifications.

---

## Environment Variables

| Variable | Scope | Description | Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | Runtime environment | `development` |
| `PORT` | Server | Backend API port | `5000` |
| `API_VERSION` | Server | API version route prefix | `v1` |
| `MONGODB_URI` | Server | MongoDB connection string (supports local `mongodb://127.0.0.1:27017/bugboard`, Docker `mongodb://mongodb:27017/bugboard`, or Atlas `mongodb+srv://...`) | `mongodb://127.0.0.1:27017/bugboard` |
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

Detailed architectural rationale and entity diagrams are in [docs/database-design.md](docs/database-design.md).

### Core Collections & Relationships
- **User**: Name, unique lowercase email, passwordHash (bcrypt), and role (`Admin`, `Developer`, `Tester`).
- **Project**: Name, unique uppercase key (regex `^[A-Z0-9-]+$`), description, and an array of `User` ObjectId references representing project members.
- **Issue**: Title, description, project reference, severity (`Low`/`Medium`/`High`/`Critical`), priority (`Low`/`Medium`/`High`/`Urgent`), status (`Open`/`In Progress`/`Testing`/`Resolved`/`Closed`), reporter reference, nullable assignee reference, and timestamps.
- **Comment**: Issue reference, author reference, content (max 2000 chars), and timestamps.
- **Activity**: Issue reference, actor reference, action, modified field, oldValue, newValue, and immutable creation timestamp.
- **Notification**: Recipient reference, actor reference, issue reference, type, title, message, read flag, and timestamps.
- **Attachment**: Issue reference, uploader reference, originalFilename, storageKey (UUID), mimeType, size (max 5MB), and timestamps.

### Indexing Summary
- `users`: `{ email: 1 }` (Unique)
- `projects`: `{ key: 1 }` (Unique)
- `issues`:
  - `{ project: 1 }` (Filter by project)
  - `{ status: 1 }` (Filter by status & dashboard metrics)
  - `{ priority: 1 }` (Filter by priority)
  - `{ severity: 1 }` (Filter by severity)
  - `{ reporter: 1 }` (Filter by reporter)
  - `{ assignee: 1 }` (Filter by assignee & personal queues)
  - `{ createdAt: -1 }` (Server-side chronological sort)
- `comments`: `{ issue: 1, createdAt: 1 }`
- `activities`: `{ issue: 1, createdAt: -1 }`
- `notifications`: `{ recipient: 1, read: 1, createdAt: -1 }`
- `attachments`: `{ issue: 1, createdAt: -1 }`

---

## Bonus Features Implemented

1. **Kanban Board with Drag-and-Drop (#1)**:
   - Native HTML5 Drag and Drop API moving cards across 5 status columns (`Open`, `In Progress`, `Testing`, `Resolved`, `Closed`).
   - Server-enforced role transitions with instant optimistic updates and automatic rollbacks upon violation.
   - Screen-reader & keyboard accessible "Move to..." action menu on each card.
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
   - 191 passing tests across 8 suites covering security, workflows, boundary fuzzing, and bonus features.
7. **Docker Compose Setup (#7)**:
   - Multi-container stack orchestrating MongoDB, Mailpit, MinIO, Node API, and Nginx SPA client.

---

## User Profiles & Admin User Management

BugBoard incorporates a comprehensive user management and profile system designed with least-privilege security:
1. **Self-Service Profiles (`/profile`)**:
   - Every user (Developers, Testers, Admins) has a profile containing name, email, employee ID, job title/designation, phone number, and avatar URL.
   - Developers and Testers can edit their own basic contact details (`name`, `phone`, `avatarUrl`).
   - Mass-assignment attacks targeting administrative credentials (`employeeId`, `designation`, `isActive`, `role`) are rejected with `422 Unprocessable Entity`.
2. **Admin User Directory (`/team`)**:
   - Role-gated directory accessible exclusively to Administrators.
   - Filter by role (`All roles`, `Developers`, `Testers`, `Admins`) and search across names, emails, and employee IDs.
   - Responsive presentation switching between an engineering data table and touch-friendly cards on mobile.
3. **Instant Account Activation & Deactivation**:
   - Administrators can activate or deactivate Developer and Tester accounts.
   - **Immediate Session Cutoff**: The `authenticate` middleware performs a lightweight MongoDB status check on every request; deactivated tokens are instantly rejected with `401 Unauthorized`.
   - **Admin Self-Deactivation Guard**: Admins are strictly prevented from deactivating their own accounts (backend 400 rejection and disabled UI controls).
   - **Assignee Integrity**: Deactivated users cannot be assigned to new or existing issues (422 rejection).

---

## Design Decisions & Known Limitations

1. **Description Excluded from Activity Log**:
   - Updates to issue descriptions are intentionally excluded from the `Activity` log. Because descriptions often contain lengthy markdown or stack traces, logging description diffs creates massive database bloat without meaningful audit utility. Title, priority, severity, status, and assignee changes remain strictly auditable.
2. **Reporter Immutability & Anti-Spoofing**:
   - `reporter` is strictly bound to `req.user.id` on creation and cannot be modified on general `PATCH` updates.
3. **Fire-and-Forget SMTP Resilience**:
   - Notification emails are dispatched asynchronously via `nodemailer`. If the SMTP server is offline or unreachable, errors are caught and logged; the parent operation (status transition or assignment) never fails.
4. **Local Disk Storage Fallback**:
   - When AWS S3 credentials are omitted, the storage driver transparently stores files on local disk in `server/uploads/` with UUID keys.
5. **Assignee Membership Enforcement**:
   - An issue can only be assigned to a user who is a registered member of the issue's parent project.
6. **Stateless JWT with Real-Time Revocation & Session Invalidation**:
   - While tokens remain stateless and cryptographically signed, an ultra-lean `.select('role isActive passwordChangedAt').lean()` check in `authenticate` guarantees that deactivated accounts are severed immediately without requiring Redis.
   - **Password Change Invalidation**: Updating your password immediately invalidates all pre-existing sessions across devices. The `authenticate` middleware rejects any JWT whose issued-at timestamp (`iat`) predates `passwordChangedAt`.
7. **Forgot Password Anti-Enumeration & Single-Use SHA-256 Tokens**:
   - `POST /auth/forgot-password` returns the exact same generic 200 response regardless of whether an email exists, preventing user enumeration.
   - Reset tokens use 32 bytes of cryptographically secure randomness (`crypto.randomBytes(32)`). Only the SHA-256 hash is persisted in MongoDB with a 30-minute expiry, and is immediately cleared upon use or retry.

---

## Automated Testing Suite

BugBoard maintains an automated test suite with **218 tests passing with 100% success rate**:

```bash
# Run all core foundation tests
npm run test --prefix server

# Run authentication & RBAC test suite
npm run test:auth --prefix server

# Run Change Password & Forgot/Reset Password test suite (14 tests)
npm run test:password --prefix server

# Run Phase 3 Projects & Issues test suite (39 tests)
npm run test:phase3 --prefix server

# Run Phase 4 Comments, Activity & Dashboard test suite (11 tests)
npm run test:phase4 --prefix server

# Run Bonus Features test suite (Kanban, Attachments, Notifications) (14 tests)
npm run test:bonus --prefix server

# Run User Profiles & Admin User Management test suite (16 tests)
npm run test:users --prefix server

# Run comprehensive Deep Bug Hunt & Adversarial Fuzzing suite (129 tests)
npm run test:hunt --prefix server

# Run the complete test suite in sequence
npm run test:all --prefix server
```

---

## Screenshots & Visual Tour

*(Reviewers can verify all screens live by starting the dev servers or running Docker Compose)*

- **Dashboard**: Executive engineering console with status metrics, critical bug alerts, and prioritized personal work queues.
- **Projects Console**: Team member rosters, project key identifiers, and role-gated administration.
- **Issue Tracker (Table View)**: Server-side query parameter filtering by project, status, priority, severity, assignee, and reporter.
- **Kanban Board**: Drag-and-drop workflow lanes with optimistic state updates.
- **Issue Detail Console**: Markdown descriptions, status transitions, attachments dropzone, threaded comments, and activity audit timeline.
- **Notification Center**: Navigation bell dropdown displaying relative timestamps and unread counters.

---

## License
MIT License. Created for the MERN Stack Technical Assessment.
