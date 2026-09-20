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
