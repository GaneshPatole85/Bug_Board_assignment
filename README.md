# BugBoard — Bug & Issue Tracking System

[![Phase 1: Foundation](https://img.shields.io/badge/Phase%201-Foundation%20%26%20Database%20Design-success)](docs/phase-01-foundation.md)
[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-blue)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey)](https://expressjs.com)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.9.5-green)](https://mongoosejs.com)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0.7-purple)](https://vitejs.dev)

A lightweight, enterprise-grade issue tracking application similar to a simplified Jira board, built with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js).

---

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Quickstart](#installation--quickstart)
- [Environment Variables](#environment-variables)
- [Database Design & Indexing Strategy](#database-design--indexing-strategy)
- [Phase Roadmap](#phase-roadmap)
- [Design Decisions & Known Limitations](#design-decisions--known-limitations)
- [License](#license)

---

## Project Overview
BugBoard is engineered to support structured issue tracking workflows:
- **Roles & Permissions**: Admin, Developer, and Tester with strict server-side validation.
- **Project Workspaces**: Unique project keys (e.g. `BUG`), descriptions, and team membership.
- **Workflow State Machine**: Strict transitions: `Open` &rarr; `In Progress` &rarr; `Testing` &rarr; `Resolved` &rarr; `Closed`.
- **Audit & Activity History**: Automated tracking of status transitions and assignee mutations.
- **Rich Dashboard & Filtering**: Server-side query parameter filtering, pagination, and developer queues.

> **Current Status**: **Phase 1: Foundation & Database Architecture**. In this phase, scaffolding, schemas, structured logging, health checks, error boundaries, and responsive navigation layouts are established. Business logic, authentication, and live data are strictly deferred to subsequent phases.

---

## Architecture & Tech Stack

### Backend (`server/`)
- **Runtime**: Node.js LTS (v20+) with native ES Modules (`"type": "module"`).
- **Web Framework**: Express.js with versioned routing (`/api/v1`).
- **Database Layer**: MongoDB native instance with Mongoose schemas and strict validations.
- **Logging**: `pino` + `pino-http` for high-throughput, structured JSON logging.
- **Validation**: `express-validator` middleware collection.
- **Security**: `helmet`, `cors`, and `express-rate-limit` scaffolds.
- **Reliability**: Graceful shutdown handlers (`SIGINT`, `SIGTERM`) and centralized error handling envelope (`{ success, message, errors }`).

### Frontend (`client/`)
- **Framework**: React.js with Vite.
- **Routing**: `react-router-dom` with placeholder routing (`/dashboard`, `/projects`, `/issues`, `/login`).
- **API Client**: Centralized Axios client (`client.js`) with request/response error normalization.
- **State**: React Context (`AppContext.jsx`) scaffolding for loading and error states.
- **Design System**: Vanilla CSS with custom properties, typography (Inter), glassmorphism headers, responsive sidebar drawer, and status indicators.

---

## Prerequisites
- **Node.js**: `v20.0.0` or higher (tested on Node v24 LTS).
- **npm**: `v10.0.0` or higher.
- **MongoDB**: Native local MongoDB service or MongoDB Atlas cluster listening on `mongodb://127.0.0.1:27017/bugboard`.

---

## Installation & Quickstart

### 1. Clone & Install Dependencies
```bash
# Clone repository
git clone <repository-url>
cd bugboard

# Install root, backend, and frontend dependencies in a single step
npm run install:all
```

### 2. Configure Environment Files
Copy the sample environment files to `.env`:
```bash
# In repository root
cp .env.example .env

# In server directory
cp server/.env.example server/.env

# In client directory
cp client/.env.example client/.env
```

### 3. Seed Sample Accounts (Phase 2 Demo Credentials)
Populate the database with test accounts for each role (`Admin`, `Developer`, `Tester`):
```bash
npm run seed --prefix server
```

#### Sample Login Accounts for Reviewers

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bugboard.test` | `Password123!` | Full system rights, project creation/updates, universal project access |
| **Developer** | `dev@bugboard.test` | `Password123!` | Issue assignment, status workflow transitions, comments |
| **Tester** | `tester@bugboard.test` | `Password123!` | Bug reporting, QA verification, status workflow transitions |

### 4. Run Automated Tests
Verify all foundation tests and the Jest authentication test suite:
```bash
# Foundation & Schema tests
npm run test:server

# Phase 2 Auth & RBAC isolated in-memory test suite
npm run test:auth --prefix server
```

### 5. Start Development Servers
You can run both backend and frontend concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Terminal 1: Start Backend API (http://localhost:5000)
npm run dev:server

# Terminal 2: Start Frontend Client (http://localhost:5173)
npm run dev:client
```

---

## Environment Variables

| Variable | Scope | Description | Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | Runtime environment | `development` |
| `PORT` | Server | Backend API listening port | `5000` |
| `API_VERSION` | Server | API version route prefix | `v1` |
| `MONGODB_URI` | Server | MongoDB native or Atlas URI | `mongodb://127.0.0.1:27017/bugboard` |
| `CLIENT_URL` | Server | Allowed CORS origin | `http://localhost:5173` |
| `LOG_LEVEL` | Server | Pino logging level (`info`, `debug`, etc.) | `info` |
| `RATE_LIMIT_WINDOW_MS` | Server | Rate limit window in ms | `900000` (15m) |
| `RATE_LIMIT_MAX_REQUESTS`| Server | Max requests allowed in window | `100` |
| `VITE_API_BASE_URL` | Client | Backend API base URL | `http://localhost:5000/api/v1` |
| `JWT_SECRET` | Server | *Reserved for Phase 2 (JWT Auth)* | `secret` |
| `JWT_EXPIRES_IN` | Server | *Reserved for Phase 2 (JWT Expiration)* | `1d` |

---

## Database Design & Indexing Strategy

Detailed architectural rationale and the Mermaid ER diagram are documented in [docs/database-design.md](docs/database-design.md).

### Core Collections & Relationships
- **User**: Name, unique lowercase email, passwordHash, and role (`Admin`, `Developer`, `Tester`).
- **Project**: Name, unique uppercase key (e.g. `BUG`), description, and an array of `User` ObjectId references representing project members.
- **Issue**: Title, description, project reference, severity (`Low`/`Medium`/`High`/`Critical`), priority (`Low`/`Medium`/`High`/`Urgent`), status (`Open`/`In Progress`/`Testing`/`Resolved`/`Closed`), reporter reference, nullable assignee reference, and timestamps.
- **Comment**: Issue reference, author reference, content, and timestamps.
- **Activity**: Issue reference, actor reference, action, modified field, oldValue, newValue, and immutable creation timestamp.

### Indexing Summary
Speculative compound indexing is strictly avoided. Indexes are created **only** where required by project filtering and uniqueness specifications:
- `users`: `{ email: 1 }` (Unique)
- `projects`: `{ key: 1 }` (Unique)
- `issues`:
  - `{ project: 1 }` (Filter by project)
  - `{ status: 1 }` (Filter by status / dashboard metric)
  - `{ priority: 1 }` (Filter by priority)
  - `{ severity: 1 }` (Filter by severity)
  - `{ reporter: 1 }` (Filter by reporter)
  - `{ assignee: 1 }` (Filter by assignee / personal queue)
  - `{ createdAt: -1 }` (Server-side sort / chronological feeds)
- `comments`: `{ issue: 1 }`
- `activities`: `{ issue: 1 }`

---

## Design Decisions & Known Limitations

1. **Native MongoDB vs. Containerization**: Per instructions, MongoDB runs as a native local or hosted cloud service via `MONGODB_URI` without requiring Docker containerization.
2. **Referencing vs. Embedding**: Users and Issues are referenced rather than embedded to avoid document bloat beyond the 16MB BSON limit and prevent duplicate data across projects.
3. **Structured Logging (Pino)**: Chose `pino` and `pino-http` over the traditional `winston` + `morgan` combination to reduce dependency overhead, achieve ultra-low latency, and generate clean structured JSON logs in production.
4. **Validation (express-validator)**: `express-validator` allows declarative middleware validation inline with Express routes without requiring an external compilation schema step.
5. **Phase 1 Boundary**: No authentication, business logic, or live database mutations are exposed yet. The health check endpoint `GET /api/v1/health` is fully operational to verify the database and server lifecycle.

---

## Phase Roadmap

- [x] **Phase 1: Foundation & Database Design**
  - Monorepo structure, Mongoose schemas, Pino logging, health checks, error handling, React Router & responsive layout.
- [x] **Phase 2: Authentication & Role-Based Access Control (RBAC)** *(Current)*
  - Registration/Login, bcrypt hashing, JWT issuance & verification, Admin/Dev/Tester role authorization middleware, rate limiting, seed credentials.
- [ ] **Phase 3: Project & Issue Management**
  - Project CRUD with membership check, Issue lifecycle state machine, server-side filtering & pagination.
- [ ] **Phase 4: Comments, Activity Audit & Dashboard**
  - Comments API, automated activity trail, dashboard count aggregations, developer queues.
- [ ] **Phase 5: Interactive UI, Kanban Board & Polish**
  - Kanban board with drag-and-drop, notifications, end-to-end integration tests, and presentation polish.
