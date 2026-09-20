/**
 * Authentication Middleware Stub
 *
 * Implemented in Phase 2:
 * - Extracts and verifies JWT bearer token from Authorization header or HTTP-only cookie.
 * - Decodes user payload, verifies active status, and attaches authenticated user to `req.user`.
 * - Rejects unauthenticated requests with HTTP 401 Unauthorized.
 */
export const authenticate = (req, res, next) => {
  // Implemented in Phase 2
  next();
};
