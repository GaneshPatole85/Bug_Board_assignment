import { logger } from '../utils/logger.js';

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Asserts that the authenticated user possesses one of the allowed roles.
 * Must be mounted after the `authenticate` middleware.
 *
 * @param {...string} allowedRoles - Permitted roles (e.g., 'Admin', 'Developer')
 */
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      logger.error({ path: req.originalUrl }, 'RBAC Error: authorizeRole invoked without authenticated req.user');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required',
        errors: [],
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        {
          userId: req.user.id,
          userRole: req.user.role,
          allowedRoles,
          path: req.originalUrl,
        },
        'RBAC Forbidden: User role is not permitted for this resource'
      );

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action',
        errors: [],
      });
    }

    next();
  };
};
