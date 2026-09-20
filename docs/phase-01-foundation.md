# BugBoard — Phase 1: Foundation & Database Architecture

## 1. Objective
Phase 1 delivers the architectural foundation, database schemas, and infrastructural scaffolding for BugBoard — a Jira-style issue and bug tracking system built with the MERN stack.

Per strict assessment guidelines, **no authentication, business logic, or working UI screens** are implemented in this phase. Phase 1 focuses exclusively on clean architecture, verifiable configuration, resilient database modeling, structured observability, and developer ergonomics.

---

## 2. What Was Built

1. **Monorepo Repository Architecture**: Root orchestration for concurrent backend and frontend development, shared configuration, and comprehensive documentation.
2. **Express.js API Foundation (ES Modules)**:
   - Modern ES module architecture (`type: "module"`) running on Node.js LTS (v24+).
   - Structured logging using `pino` and `pino-http` (zero redundant dependencies, high throughput, ISO timestamps).
   - Fail-fast MongoDB connection with graceful shutdown handlers for `SIGINT` and `SIGTERM`.
   - Centralized error-handling pipeline returning a uniform JSON envelope: `{ success, message, errors }`.
   - Centralized 404 handler for unmatched routes.
   - API versioning architecture mounting all endpoints under `/api/v1`.
   - Health check endpoint (`GET /api/v1/health`) reporting server uptime, environment, and live MongoDB `readyState`.
   - Validation collector middleware using `express-validator`.
   - Security scaffolding (`helmet`, CORS origin validation, `express-rate-limit` scaffolds).
   - Auth and RBAC middleware stubs reserved for Phase 2.
3. **Database Schemas (Mongoose Models)**:
   - Complete schema designs for `User`, `Project`, `Issue`, `Comment`, and `Activity`.
   - Enforced constraints: string lengths, lowercase emails, uppercase project keys, workflow status/severity/priority enums.
   - Non-speculative indexing strictly aligned with assignment search/filter parameters.
4. **React.js + Vite Frontend Foundation**:
   - Client scaffolding with `react-router-dom` and route placeholders (`/dashboard`, `/projects`, `/issues`, `/login`, `*`).
   - Centralized Axios client (`client.js`) with request interceptor for future JWT auth and response interceptor for normalized error payloads.
   - Global UI state scaffold using React Context (`AppContext.jsx` and `useApp` hook).
   - Responsive layout (`MainLayout.jsx`) with responsive header, live backend connectivity status pill, mobile drawer navigation, and clean Vanilla CSS design system.
5. **Native MongoDB Integration**:
   - Direct connection to native/local MongoDB instance or MongoDB Atlas via `MONGODB_URI`.

---

## 3. Repository & Folder Structure

```
bugboard/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js             # Centralized Axios client with error normalization
│   │   ├── context/
│   │   │   └── AppContext.jsx         # Global state provider and custom useApp hook
│   │   ├── layouts/
│   │   │   ├── MainLayout.jsx        # Responsive header + sidebar + content layout
│   │   │   └── MainLayout.css        # Vanilla CSS layout styles with responsive breakpoints
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx     # Dashboard placeholder
│   │   │   ├── ProjectsPage.jsx      # Projects management placeholder
│   │   │   ├── IssuesPage.jsx        # Issues & bug tracker placeholder
│   │   │   ├── LoginPage.jsx         # Login & auth placeholder
│   │   │   └── NotFoundPage.jsx      # 404 page
│   │   ├── App.jsx                   # React Router routing configuration
│   │   ├── index.css                 # Global CSS design tokens and base styles
│   │   └── main.jsx                  # React DOM entry point
│   ├── .env.example                  # Client environment variables
│   ├── index.html                    # HTML5 entry with Inter font
│   ├── package.json
│   └── vite.config.js                # Vite build and dev server config
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # MongoDB connection & graceful shutdown manager
│   │   │   └── env.js                # Centralized environment variable loader
│   │   ├── constants/
│   │   │   ├── index.js              # Re-exports all constants
│   │   │   ├── roles.js              # Admin, Developer, Tester roles
│   │   │   └── issueWorkflow.js      # Status, Severity, Priority enums & transitions
│   │   ├── controllers/
│   │   │   └── health.controller.js  # GET /api/v1/health handler
│   │   ├── middlewares/
│   │   │   ├── authenticate.js       # Phase 2 stub
│   │   │   ├── authorizeRole.js      # Phase 2 stub
│   │   │   ├── authorizeProjectAccess.js # Phase 2 stub
│   │   │   ├── errorHandler.js       # Centralized error handling
│   │   │   ├── notFoundHandler.js    # Unmatched route 404 handler
│   │   │   ├── rateLimiter.js        # express-rate-limit scaffold
│   │   │   ├── requestLogger.js      # pino-http request logger
│   │   │   └── validateRequest.js    # express-validator result collector
│   │   ├── models/
│   │   │   ├── index.js              # Model exports
│   │   │   ├── User.js               # User Mongoose schema
│   │   │   ├── Project.js            # Project Mongoose schema
│   │   │   ├── Issue.js              # Issue Mongoose schema
│   │   │   ├── Comment.js            # Comment Mongoose schema
│   │   │   └── Activity.js           # Activity audit log Mongoose schema
│   │   ├── routes/
│   │   │   ├── index.js              # Main API router (/api/v1)
│   │   │   └── health.routes.js      # Health check router
│   │   ├── services/                 # Placeholder for Phase 2/3 business logic
│   │   ├── validators/               # Placeholder for Phase 2/3 express-validators
│   │   ├── jobs/                     # Placeholder for background jobs
│   │   ├── utils/
│   │   │   └── logger.js             # Pino structured logger instance
│   │   ├── app.js                    # Express application setup
│   │   └── server.js                 # HTTP listener & startup bootstrap
│   ├── tests/
│   │   └── foundation.test.js        # Node.js test suite for schemas and foundation
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── database-design.md            # Schema reasoning, index analysis, Mermaid ER
│   └── phase-01-foundation.md        # Phase 1 documentation & verification guide
├── .env.example                      # Root environment variables template
├── .gitignore                        # Standard Git ignore rules
├── README.md                         # Project documentation and quickstart
└── package.json                      # Monorepo orchestration scripts
```

---

## 4. Environment Variables Introduced

| Variable | Target | Description | Example Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | Application execution environment | `development` |
| `PORT` | Server | Backend HTTP listening port | `5000` |
| `API_VERSION` | Server | API version route prefix | `v1` |
| `MONGODB_URI` | Server | Native MongoDB or Atlas connection URI | `mongodb://127.0.0.1:27017/bugboard` |
| `CLIENT_URL` | Server | Allowed frontend origin for CORS | `http://localhost:5173` |
| `LOG_LEVEL` | Server | Structured log verbosity level | `info` |
| `RATE_LIMIT_WINDOW_MS` | Server | Rate limiting window in milliseconds | `900000` (15m) |
| `RATE_LIMIT_MAX_REQUESTS` | Server | Maximum requests permitted per window | `100` |
| `VITE_API_BASE_URL` | Client | Base URL pointing to Express backend | `http://localhost:5000/api/v1` |
| `JWT_SECRET` | Server | *Reserved for Phase 2 (JWT Auth)* | `min_32_chars_secret` |
| `JWT_EXPIRES_IN` | Server | *Reserved for Phase 2 (JWT Expiration)* | `1d` |

---

## 5. Database Service (Native MongoDB)

Per user instruction, MongoDB is configured to run natively/locally or via an external cloud connection string (e.g. MongoDB Atlas) rather than inside a Docker container.

- **Connection Management**: Handled in `server/src/config/db.js`.
- **Fail-Fast Startup**: If the database is unreachable, the server exits immediately with code 1 and outputs a structured diagnostic error log.
- **Graceful Shutdown**: Intercepts `SIGINT` (Ctrl+C) and `SIGTERM`, drains active HTTP requests, and closes the Mongoose connection cleanly (`mongoose.connection.close()`).

---

## 6. Exact Commands to Run and Verify

### 6.1 Install Dependencies
From the repository root:
```bash
npm run install:all
```

### 6.2 Verify Schemas and Foundation (Automated Test)
Run the Node.js built-in test runner against the foundation test suite:
```bash
cd server
npm test
```

### 6.3 Start Backend API Server
Ensure your local MongoDB instance is active (e.g., `mongod` or local MongoDB service listening on `127.0.0.1:27017`), then start the backend server:
```bash
# In server directory:
npm run dev
```
Verify the health check endpoint:
```bash
# In a separate terminal or browser:
curl http://localhost:5000/api/v1/health
```
Expected output:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-09-20T...",
  "uptimeSeconds": 12,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "readyState": 1,
    "host": "127.0.0.1",
    "name": "bugboard"
  }
}
```

Verify the 404 error handler:
```bash
curl http://localhost:5000/api/v1/non-existent-route
```
Expected output:
```json
{
  "success": false,
  "message": "Resource not found: GET /api/v1/non-existent-route",
  "errors": []
}
```

### 6.4 Build and Run Frontend Client
```bash
# In client directory:
npm run build
npm run dev
```
Open `http://localhost:5173` in your browser.
- Verify navigation between `/dashboard`, `/projects`, `/issues`, and `/login`.
- Verify the responsive sidebar drawer on mobile viewport (< 768px).
- Verify the backend health indicator pill in the top header.

---

## 7. Known Limitations & Explicitly Deferred Items

The following requirements from the specification are intentionally and explicitly deferred to subsequent phases:

| Feature / Area | Phase 1 Status | Planned Phase |
| :--- | :--- | :--- |
| **Authentication & User Registration** | Schema created; endpoints deferred | **Phase 2** |
| **JWT Generation & Verification** | Stubs in `authenticate.js` | **Phase 2** |
| **Bcrypt Password Hashing** | Field `passwordHash` in schema | **Phase 2** |
| **RBAC Enforcement (Admin/Dev/Tester)** | Stubs in `authorizeRole.js` | **Phase 2** |
| **Project CRUD & Membership Control** | Model created; routes deferred | **Phase 3** |
| **Issue Creation & State Transitions** | Model created; transition logic deferred | **Phase 3** |
| **Server-Side Filtering & Pagination** | Indexes defined; query handlers deferred | **Phase 3** |
| **Comments & Activity History Logging** | Models created; service methods deferred | **Phase 4** |
| **Dashboard Analytics & Personal Queues** | Placeholder UI; aggregations deferred | **Phase 4** |
| **Kanban Board & Polish** | Deferred | **Phase 5** |
