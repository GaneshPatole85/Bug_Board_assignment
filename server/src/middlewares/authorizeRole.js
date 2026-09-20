/**
 * Role-Based Access Control (RBAC) Middleware Stub
 *
 * Implemented in Phase 2:
 * - Checks req.user.role against permitted roles (e.g. Admin, Developer, Tester).
 * - Enforces permissions on the backend (e.g., only Admin can create/update projects).
 * - Rejects unauthorized requests with HTTP 403 Forbidden.
 *
 * @param {...string} allowedRoles - Permitted roles (e.g., 'Admin', 'Developer')
 */
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Implemented in Phase 2
    next();
  };
};
