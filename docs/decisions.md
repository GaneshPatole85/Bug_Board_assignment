# BugBoard — Architectural Decision Records (ADRs)

This document records the foundational architectural decisions, tradeoffs, and production considerations made throughout the design of BugBoard.

---

## ADR 01: Client-Side Token Storage (`localStorage` vs. `httpOnly` Cookies)

### Context
When authenticating via stateless JSON Web Tokens (JWT) in a Single-Page Application (SPA) built with React and Express, the client must store the JWT across HTTP requests.

### Options Considered
1. **`httpOnly` SameSite Cookies**:
   - *Pros*: Impervious to cross-site scripting (XSS) attacks because JavaScript execution cannot read the cookie content.
   - *Cons*: Subject to Cross-Site Request Forgery (CSRF) attacks, requiring explicit anti-CSRF token verification middleware, complex CORS cookie negotiation during cross-origin deployments, and additional setup in API clients.
2. **Client-Side `localStorage`**:
   - *Pros*: Straightforward integration with Axios request interceptors (`Authorization: Bearer <token>`), eliminates CSRF vulnerabilities, easy to test via Postman/curl, and works seamlessly across detached mobile or web clients.
   - *Cons*: Vulnerable if an XSS attack successfully executes on the frontend.

### Decision
We selected **`localStorage`** for storing the active JWT token.
- Axios request interceptors in `client/src/api/client.js` read the token from `localStorage` and inject standard `Bearer` authorization headers.
- To mitigate XSS risks, our backend employs `helmet` with strict Content Security Policy (CSP) and input sanitization via `express-validator`.

### How We Would Do It in Production
In an enterprise banking or compliance-driven environment, we would employ **Short-Lived Access Tokens stored in memory (React state)** coupled with **Rotating Refresh Tokens stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie**, paired with CSRF double-submit cookies.

---

## ADR 02: Stateless JWT Architecture vs. Stateful Token Blacklisting

### Context
The application requires authenticated sessions across API calls. When a user logs out or credentials change, the question arises whether to invalidate the issued token on the server.

### Options Considered
1. **Stateful Token Blacklisting (Redis / Database Cache)**:
   - *Pros*: True instant logout; compromised tokens can be revoked immediately.
   - *Cons*: Re-introduces state and a distributed dependency (e.g. Redis container or database lookups on every single authenticated request), eliminating the core benefit of stateless JWTs.
2. **Stateless JWT with Client-Side Token Purge**:
   - *Pros*: Zero database lookup overhead on authenticated requests, simple architecture, lightweight for a 2-day technical assessment.
   - *Cons*: If a token is stolen, it remains cryptographically valid until its expiration (24h).

### Decision
We adopted **Stateless JWTs with a 24-hour expiration (`1d`)** and client-side logout (purging `localStorage`).
- When a user logs out, the frontend purges the token and clears the authentication context.
- No dedicated `/logout` endpoint is implemented because the backend maintains no state.

### How We Would Do It in Production
In production, we would use:
1. **Ultra Short-Lived Access Tokens**: Expiring in 15 minutes.
2. **Refresh Token Rotation**: Stored in Redis with automatic family revocation upon reuse detection.
3. **Revocation List**: A fast Redis bloom filter or key-value store with TTL matching the access token lifespan to instantly blacklist tokens on logout or password resets.

---

## ADR 03: Profile Field Editability Split (Self-Service vs. Administrative Control)

### Context
User accounts hold both personal contact data and enterprise administrative credentials. Permitting end users to update their own organizational attributes creates privilege escalation vulnerabilities.

### Decision
We strictly partitioned user profile fields into two distinct tiers:
1. **Self-Editable Fields** (`name`, `email`, `phone`, `avatarUrl`):
   - Modifiable by any authenticated user via `PATCH /api/v1/users/me`.
   - `email` changes verify uniqueness against existing registered users, rejecting collisions with HTTP `409 Conflict`, while idempotent updates (matching current email) succeed with `200 OK`.
   - Protected against mass-assignment: any incoming payload containing administrative attributes (`employeeId`, `department`, `designation`, `isActive`, or `role`) is immediately rejected with HTTP `422 Unprocessable Entity` rather than silently dropped.
2. **Admin-Controlled Fields** (`department`, `designation`, `role`, `isActive`):
   - Modifiable only by users holding the `Admin` role via `PATCH /api/v1/users/:userId`.
   - `employeeId` is strictly immutable across all routes per ADR 06.
   - Read-only across self-service views.

---

## ADR 04: Immediate Token Cutoff for Deactivated Users via Lightweight Middleware DB Check

### Context
When an Administrator deactivates a user account, any active sessions holding unexpired JWTs could potentially continue accessing the system if authentication relied purely on signature verification.

### Decision
We upgraded the `authenticate` middleware to perform a lightweight, lean MongoDB lookup (`User.findById(decoded.sub).select('role isActive').lean()`) on incoming requests:
- If `user.isActive === false`, the request is immediately aborted with HTTP `401 Unauthorized` (`"Your account has been deactivated. Contact an administrator."`).
- In addition, login attempts for deactivated accounts are rejected with the same specific message after constant-time password verification (preventing timing side-channels).
- By selecting only `role` and `isActive` with `.lean()`, the query overhead is minimal (sub-millisecond) and completely eliminates the security loophole without requiring external caching infrastructure.

---

## ADR 05: Admin Blanket Self-Edit Prohibition on Administrative Endpoint

### Context
Allowing an Administrator to modify their own record via the administrative management route (`PATCH /api/v1/users/:userId`) creates an architectural contradiction: organizational credentials (`employeeId`, `designation`) must be assigned strictly by administrators, meaning no user—including an Admin—can assign themselves organizational credentials. Furthermore, self-deactivation creates lockout risks.

### Decision
Both the backend and frontend enforce a blanket prohibition on self-targeted requests to `PATCH /api/v1/users/:userId`:
- In `UserService.updateUserAsAdmin`: if `targetUserId.toString() === adminUserId.toString()`, the request is immediately rejected with HTTP `403 Forbidden` (`"Use your profile page to update your own information; administrators cannot edit their own organizational record through this endpoint."`).
- This single clean guard subsumes and replaces the previous narrower self-deactivation check.
- In the frontend `TeamPage`, both the "Edit" and "Deactivate" buttons on the current user's own row are disabled and grayed out, displaying informative tooltips:
  - Edit: *"Manage your own info from your Profile page"*
  - Deactivate: *"You can't deactivate your own account"*

---

## ADR 06: System-Generated Atomic Counter for Employee Identifiers (`employeeId`) & Immutability

### Context
Manual assignment of `employeeId` by administrators creates typos, ID collisions, format drift, and security loopholes. In real enterprise environments, employee identifiers are deterministic, role-prefixed, sequential, and system-issued upon account creation.

### Decision
1. **Format**: Role-prefixed, zero-padded, sequential per role:
   - Administrators: `ADM-0001`, `ADM-0002`...
   - Developers: `DEV-0001`, `DEV-0002`...
   - Testers: `TST-0001`, `TST-0002`...
2. **Atomic & Race-Safe Generation**:
   - Implemented a dedicated `Counter` collection in MongoDB (`_id`: `'ADM' | 'DEV' | 'TST'`, `seq`: `Number`).
   - Incremented via atomic `findOneAndUpdate` with `$inc: { seq: 1 }` and `upsert: true`, preventing race conditions during concurrent account registrations.
3. **Single Source of Truth**:
   - `generateEmployeeId(role)` in `counter.service.js` is the unified generation function used by both self-registration (`AuthService.registerUser`) and database seeding (`seed.js`).
4. **Complete Immutability**:
   - Once set, `employeeId` is strictly immutable across all client routes (`PATCH /api/v1/users/me` and `PATCH /api/v1/users/:userId`). Disallowed attempts to update `employeeId` are silently ignored, leaving the database value intact while other fields (such as `designation`) update normally.
   - The Team Directory "Edit" modal contains no input field for Employee ID; it is purely displayed as a read-only tag.
5. **Backfill Migration**:
   - A dedicated idempotent migration script (`server/src/utils/migrate-employee-ids.js`) was established to backfill IDs sequentially ordered by `createdAt` for any legacy accounts.

---

## ADR 07: Active-Status Guard on Issue Lifecycle and Assignment

### Context
Issues should not be assigned or reassigned to deactivated personnel, as inactive users cannot act upon tasks.

### Decision
We introduced active-status verification in `IssueService`:
- On `createIssue` and `updateIssueAssignee`, the service checks `assignee.isActive`. If `false`, the operation is aborted with HTTP `422 Unprocessable Entity` (`"Selected assignee is inactive and cannot be assigned to issues"`).
- Existing issues previously assigned to a deactivated user retain their historical association without mutation, ensuring full audit trail integrity.

---

## ADR 08: Project Membership Inactive State Handling & Historical Integrity

### Context
When adding or managing project members, deactivated users should not be added to new projects, but existing project roster history must not be erased.

### Decision
1. In the project creation and edit forms, the user selection directory filters out inactive users unless they were already members of that specific project.
2. Inactive existing members are visibly flagged with an `(Inactive)` badge.
3. Historical audit records, comments, and issue authoring by deactivated users remain untouched.

---

## ADR 09: Stateless Session Invalidation via `passwordChangedAt` Timestamp Check

### Context
When a user updates their password (either via self-service Change Password or Forgot Password reset), all other active sessions and tokens must be immediately revoked to prevent session hijacking. Traditional solutions often introduce stateful token blacklists or Redis distributed caches.

### Decision
We introduced a `passwordChangedAt` (Date) attribute on the `User` schema.
1. **Zero New Infrastructure**: Because the `authenticate` middleware was already executing a lightweight per-request DB lookup (`.select('role isActive')` for instant deactivation enforcement), we simply extended that projection to `.select('role isActive passwordChangedAt')`.
2. **Timestamp Verification**: The middleware compares the JWT's issued-at claim (`decoded.iat`, in seconds) against `Math.floor(userDoc.passwordChangedAt.getTime() / 1000)`. If `iat` predates the password change timestamp, the request is rejected with HTTP `401 Unauthorized` (`"Unauthorized: Session expired, please sign in again"`).
3. **Backward Compatibility**: Pre-existing sessions where `passwordChangedAt` is `null`/unset are treated as "never changed" and remain valid without forced logout.
4. **Architectural Alignment**: This design preserves the stateless JWT architecture established in ADR 02 without adding Redis or stateful server-side session tables.

---

## ADR 10: Anti-Enumeration Protections on Forgot Password Endpoint

### Context
Publicly accessible authentication endpoints can be abused by malicious actors to harvest valid user email addresses (account enumeration) through differential response codes, messages, or timing.

### Decision
1. **Uniform Response**: `POST /api/v1/auth/forgot-password` unconditionally returns HTTP `200 OK` with an identical generic message: `"If an account with that email exists, a reset link has been sent."` whether the email matches an active user, matches a deactivated user, or does not exist at all.
2. **Selective Token Generation**: Reset tokens and emails are generated strictly when the email corresponds to an active account (`isActive !== false`). Deactivated accounts and non-existent accounts receive identical success responses without generating tokens or dispatching emails, preventing account status leakage.
3. **Volume Rate Limiting**: The endpoint is guarded by `authRateLimiter` to prevent brute-force abuse and bulk enumeration attempts.

---

## ADR 11: Cryptographically Secure Single-Use Reset Token Lifecycle with SHA-256 Hashing

### Context
Password reset links must protect accounts against token interception, database leaks, and replay attacks.

### Decision
1. **Generation**: Reset tokens are generated using `crypto.randomBytes(32).toString('hex')` (256 bits of entropy).
2. **Hash-at-Rest**: The raw token is only ever transmitted in the email link (`/reset-password?token=<raw>`). The database stores only the SHA-256 digest (`passwordResetTokenHash`) with `select: false` so it is never exposed in queries.
3. **Time-Limited Expiry**: Tokens are bounded by a 30-minute validity window (`passwordResetExpires: Date.now() + 30 * 60 * 1000`).
4. **Single-Use Invalidation**: Upon successful password reset, `passwordResetTokenHash` and `passwordResetExpires` are cleared immediately (`null`), preventing token reuse.

---

## ADR 12: 422 Unprocessable Entity Selection for Change Password Failures

### Context
In self-service Change Password (`PATCH /api/v1/auth/change-password`), when an authenticated user provides an incorrect current password, the API must return an appropriate HTTP status code.

### Decision
We explicitly chose **`422 Unprocessable Entity` (ValidationError)** rather than `401 Unauthorized`.
- In BugBoard's client-side architecture, the centralized Axios response interceptor intercepts all `401 Unauthorized` responses, clears `bugboard_token` from `localStorage`, and triggers a forced logout redirect to `/login`.
- If a typo in "Current Password" returned `401`, the user would be abruptly logged out of their session.
- Returning `422` with `{ field: 'currentPassword', message: 'Current password is incorrect' }` provides clean, inline field error feedback without destroying the active session.

---

## ADR 13: Database-Location-Agnostic Architecture (Atlas, Local Native Mongo, Docker)

### Context
BugBoard needs to run reliably across varied development, testing, CI/CD, and production environments:
1. Production and staging deployments on managed cloud infrastructure (MongoDB Atlas).
2. Local development workflows on developer workstations with native `mongod` or ephemeral in-memory MongoDB.
3. Containerized full-stack deployments via Docker Compose.

### Options Considered
1. **Environment-Specific Database Connectors**: Separate connection logic, conditional schema plugins, or specialized driver configurations for cloud vs. local deployments.
2. **Unified Mongoose URI-Driven Architecture**: Rely strictly on standard MongoDB connection strings (`MONGODB_URI`) where protocol schemes (`mongodb://` vs. `mongodb+srv://`), replica set discovery, TLS/SSL encryption, write concerns (`w=majority`), and retry writes (`retryWrites=true`) are handled transparently by the official MongoDB driver and Mongoose without code branching.

### Decision
We adopted **Unified URI-Driven Architecture via Mongoose**.
- BugBoard connects interchangeably to MongoDB Atlas, local native MongoDB, or Dockerized MongoDB via a single environment variable: `MONGODB_URI`.
- **Zero Application Code Changes**: Migrating from local development to MongoDB Atlas required zero changes to business logic, controllers, or models.
- **TLS/SSL & SRV Handling**: Atlas SRV records (`mongodb+srv://`) automatically resolve replica set topology and enforce TLS without manual certificate paths or code-level TLS flags.
- **Graceful Shutdown**: The existing `mongoose.connection.close()` handlers on `SIGINT` and `SIGTERM` operate cleanly regardless of whether the target database is a local process or a remote cloud cluster.


