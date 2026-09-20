import { logger } from '../utils/logger.js';
import { ROLES } from '../constants/roles.js';

/**
 * Project-Level Access Authorization Middleware.
 *
 * Checks if the authenticated user is an Admin (universal access)
 * or an assigned member of the target project (via project.members array).
 *
 * NOTE: Phase 2 implements and unit-tests this middleware in isolation.
 * In Phase 3, it will be wired directly into Project and Issue routes where
 * the target project document is loaded onto `req.project`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const authorizeProjectAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required',
      errors: [],
    });
  }

  // Admins possess universal access across all projects
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  // Target project should be loaded by previous middleware / controller
  const project = req.project;
  if (!project) {
    logger.error('authorizeProjectAccess invoked without req.project attached');
    return res.status(500).json({
      success: false,
      message: 'Internal server error: Project context not found',
      errors: [],
    });
  }

  const userIdStr = req.user.id.toString();
  const isMember = Array.isArray(project.members) && project.members.some((memberId) => {
    const id = memberId?._id ? memberId._id.toString() : memberId?.toString();
    return id === userIdStr;
  });

  if (!isMember) {
    logger.warn(
      { userId: req.user.id, projectId: project._id },
      'Forbidden: User is not an authorized member of this project'
    );
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have access to this project',
      errors: [],
    });
  }

  next();
};
