# BugBoard — Phase 2: Authentication, Security & Role-Based Access Control (RBAC)

## 1. Objective
Phase 2 implements the complete security layer, user identity subsystem, and role-based access control (RBAC) for BugBoard. It introduces password hashing, stateless JSON Web Token (JWT) issuance and verification, role-based authorization for **Admin**, **Developer**, and **Tester**, route rate limiting, seed credentials, an isolated in-memory test suite, and an interactive frontend authentication experience.

---

## 2. What Was Built

1. **Password Security**:
   - Integrated `bcryptjs` with a cost factor (salt rounds) of **12** for secure password hashing.
   - Implemented an automated Mongoose pre-save hook on the `User` model to hash modified passwords.
   - Implemented `user.comparePassword(candidatePassword)` for constant-time bcrypt verification.
   - Enforced password exclusion via `select: false` and `toJSON`/`toObject` schema transforms to prevent hash leakage.
2. **Stateless JWT Infrastructure**:
   - Created `server/src/utils/jwt.js` using `jsonwebtoken` to sign and verify tokens using HMAC-SHA256 (`HS256`).
   - Token payload is strictly privacy-conscious (no PII): `{ sub: user._id, role: user.role }`.
   - Activated `JWT_SECRET` and `JWT_EXPIRES_IN` (1d) in centralized configuration.
3. **Decoupled Business Logic**:
   - `server/src/services/auth.service.js`: Contains all business logic for `registerUser`, `loginUser`, and `getUserById`.
   - Controllers remain thin and focused exclusively on HTTP transport and standard error envelopes.
4. **Middleware & Security**:
   - `middlewares/authenticate.js`: Extracts `Bearer <token>`, verifies signature/expiration, and attaches `req.user = { id, role }`. Logs specific failure reasons (expired, malformed, invalid signature) while returning a safe, generic HTTP 401 response.
   - `middlewares/authorizeRole.js`: Enforces role-based permissions (`authorizeRole('Admin', ...)`), returning HTTP 403 Forbidden for unauthorized roles.
   - `middlewares/authorizeProjectAccess.js`: Implemented and unit-tested project membership validation.
   - `middlewares/rateLimiter.js`: Applied `authRateLimiter` (10 requests per 15-minute window) to `/api/v1/auth/register` and `/api/v1/auth/login`.
5. **Express-Validator Schemas**:
   - `validators/auth.validators.js`: Validates registration (`name`, `email`, min 8-char `password`, role restricted to `Developer` or `Tester`).
6. **Seed Credentials Generator**:
   - `server/src/utils/seed.js`: Idempotent script (`npm run seed --prefix server`) provisioning Admin, Developer, and Tester accounts with clear test credentials.
7. **Frontend Auth Experience**:
   - `AuthContext.jsx`: Manages reactive user state, token persistence in `localStorage`, and session restoration via `GET /api/v1/auth/me`.
   - `ProtectedRoute.jsx`: Gated route wrapper with loading spinner and role-aware restriction card.
   - Interactive `LoginPage.jsx` featuring form validation, error banners, and **one-click Quick-Fill buttons** for reviewers.
   - Interactive `RegisterPage.jsx` with Developer/Tester role selection and redirection to login.
   - Role-aware Header and Sidebar with active user badge and Logout button.

---

## 3. Permission Matrix (Finalized)

The following permission matrix governs platform actions across roles:

| Action | Admin | Developer | Tester | Architectural Rationale |
| :--- | :---: | :---: | :---: | :--- |
| **Login** | Yes | Yes | Yes | Universal entry point for all authenticated actors. |
| **Register (Self-Service)** | N/A | Yes | Yes | Admin accounts cannot be self-registered (prevents privilege escalation). |
| **Create Project** | Yes | No | No | Workspace provisioning is strictly an administrative responsibility. |
| **Update Project** | Yes | No | No | Project settings and membership assignments are restricted to Admins. |
| **View Allowed Projects** | Yes (All) | Yes (Member-of) | Yes (Member-of) | Admins have global audit visibility; Devs and Testers are siloed to assigned projects. |
| **Create Issue** | Yes | Yes | Yes | Anyone authorized on a project can report bugs or tasks. |
| **Assign Issue** | Yes | Yes | No | Testers report/verify bugs but do not manage engineering team workload. |
| **Change Issue Status** | Yes | Yes | Yes | Testers reopen unresolved bugs; Developers transition bugs to Testing. |
| **Comment on Issue** | Yes | Yes | Yes | Open collaboration across all project members. |

---

## 4. Decided Ambiguities (Design Decisions)

1. **No Public Admin Self-Registration**:
   - `/api/v1/auth/register` only permits `role: "Developer"` or `role: "Tester"`.
   - Any attempt to register as `Admin` is rejected with **HTTP 422 Unprocessable Entity**. Admin accounts are exclusively provisioned via the database seed script.
2. **Stateless JWT (No Token Blacklist / No Logout Route)**:
   - Logout is handled entirely on the client by purging the token from `localStorage`.
   - *Production Tradeoff*: A stateful blacklist in Redis or short-lived tokens with refresh-token rotation would introduce excessive complexity for a 2-day assessment. Documented in [docs/decisions.md](decisions.md).
3. **Frontend Token Storage (`localStorage`)**:
   - Stored in `localStorage` for clean Axios interceptor integration.
   - *Production Tradeoff*: Storing in `localStorage` is vulnerable to XSS, whereas `httpOnly` cookies mitigate XSS but require CSRF protection. Documented in [docs/decisions.md](decisions.md).
4. **Account Enumeration Prevention**:
   - Failed login attempts always return **HTTP 401** with the identical generic message: `"Invalid email or password"`, regardless of whether the email exists or the password was incorrect.
   - Registration on an existing email returns **HTTP 409 Conflict** with `"Email already registered"`.
5. **No Auto-Login on Registration**:
   - Registration returns **HTTP 201 Created** with the sanitized user record. It intentionally does not issue a JWT token. The user is redirected to `/login` to sign in explicitly.

---

## 5. Security Considerations

* **Password Hashing**: `bcryptjs` with cost factor 12 (~250ms compute time), providing robust defense against GPU-based offline dictionary attacks.
* **Token Expiry**: Default 24 hours (`1d`). Signed using `HS256` with `JWT_SECRET`.
* **Rate Limiting**: `authRateLimiter` restricts IP addresses to 10 requests per 15-minute window on registration and login endpoints to thwart credential stuffing.
* **Header Hardening**: `helmet` enforces Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and frame restrictions.

---

## 6. API Endpoints Added

### `POST /api/v1/auth/register`
* **Access**: Public (Rate-limited: 10 req / 15 min)
* **Request Body**:
  ```json
  {
    "name": "Alex Developer",
    "email": "alex@bugboard.test",
    "password": "Password123!",
    "role": "Developer"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully. Please proceed to login.",
    "data": {
      "user": {
        "_id": "66f0a1b2...",
        "name": "Alex Developer",
        "email": "alex@bugboard.test",
        "role": "Developer",
        "createdAt": "2026-09-20T...",
        "updatedAt": "2026-09-20T..."
      }
    }
  }
  ```
* **Failure Responses**:
  - `409 Conflict`: `{"success": false, "message": "Email already registered", "errors": [...]}`
  - `422 Unprocessable Entity`: Validation failure (e.g. password < 8 chars, role is Admin).

### `POST /api/v1/auth/login`
* **Access**: Public (Rate-limited: 10 req / 15 min)
* **Request Body**:
  ```json
  {
    "email": "alex@bugboard.test",
    "password": "Password123!"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "66f0a1b2...",
        "name": "Alex Developer",
        "email": "alex@bugboard.test",
        "role": "Developer"
      }
    }
  }
  ```
* **Failure Responses**:
  - `401 Unauthorized`: `{"success": false, "message": "Invalid email or password", "errors": [...]}`
  - `422 Unprocessable Entity`: Validation failure (missing email or password).

### `GET /api/v1/auth/me`
* **Access**: Private (Requires `Authorization: Bearer <token>`)
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Current user profile retrieved successfully",
    "data": {
      "user": {
        "_id": "66f0a1b2...",
        "name": "Alex Developer",
        "email": "alex@bugboard.test",
        "role": "Developer"
      }
    }
  }
  ```
* **Failure Response**:
  - `401 Unauthorized`: `{"success": false, "message": "Unauthorized: Invalid or expired token", "errors": []}`

---

## 7. Sample Login Credentials (For Reviewers)

Run `npm run seed --prefix server` to initialize these accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bugboard.test` | `Password123!` | Full system rights, project creation/updates, universal project access |
| **Developer** | `dev@bugboard.test` | `Password123!` | Issue assignment, status workflow transitions, comments |
| **Tester** | `tester@bugboard.test` | `Password123!` | Bug reporting, verification, status workflow transitions |

---

## 8. Test Suite & Verification Results

Backend testing is powered by **Jest + Supertest + `mongodb-memory-server`**, providing complete isolation from the native development database.

Run command:
```bash
npm run test:auth --prefix server
```

### Test Results Summary:
* `POST /api/v1/auth/register`
  - ✔ 1. Successful registration &rarr; 201, no password in response
  - ✔ 2. Duplicate email registration &rarr; 409 Conflict
  - ✔ 3. Registration with role: "Admin" &rarr; rejected with 422 Unprocessable Entity
* `POST /api/v1/auth/login`
  - ✔ 4. Successful login &rarr; 200 with JWT token and user profile
  - ✔ 5. Login with wrong password &rarr; 401 with generic error message
  - ✔ 6. Login with non-existent email &rarr; 401 with same generic message (proves no user enumeration)
* `GET /api/v1/auth/me`
  - ✔ 7. GET /auth/me with no token &rarr; 401 Unauthorized
  - ✔ 8. GET /auth/me with malformed/invalid token &rarr; 401 Unauthorized
  - ✔ 9. GET /auth/me with expired token &rarr; 401 Unauthorized
  - ✔ 10. GET /auth/me with valid token &rarr; 200 with user data
* `RBAC Middleware Unit Tests`
  - ✔ 11. `authorizeRole` middleware allows permitted role and rejects unpermitted role with 403
  - ✔ 12. `authorizeProjectAccess` middleware: allows member or admin, rejects non-member with 403

**Status: 12 / 12 Tests Passed.**

---

## 9. Exact Commands to Run and Verify

```bash
# 1. Run all backend tests (In-memory MongoDB isolated tests)
npm run test:auth --prefix server

# 2. Seed test accounts (requires native MongoDB running on 127.0.0.1:27017)
npm run seed --prefix server

# 3. Start development servers
npm run dev

# 4. Manual Verification via curl:
# Register a tester:
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"QA Sam","email":"sam.qa@test.com","password":"Password123!","role":"Tester"}'

# Login:
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bugboard.test","password":"Password123!"}'

# Get Me:
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN_RETURNED_ABOVE>"
```

---

## 10. Known Limitations & Deferred Items

* **No Token Revocation**: JWT is stateless; revoking a token before its 24h expiration is not supported without a server-side Redis cache or token blacklist.
* **No Refresh Tokens**: Token rotation is intentionally omitted for assessment simplicity.
* **No Project/Issue Routes**: Project CRUD and Issue state machines are strictly deferred to Phase 3.
