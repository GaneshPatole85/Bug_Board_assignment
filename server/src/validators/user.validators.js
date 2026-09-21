import { body, query } from 'express-validator';
import { ROLES_LIST } from '../constants/roles.js';
import { validateRequest } from '../middlewares/validateRequest.js';

/**
 * Mass-assignment guard for self-service profile updates.
 * Rejects any attempt to set administrative or sensitive fields.
 */
const checkSelfUpdateMassAssignment = (req, res, next) => {
  const disallowedFields = ['employeeId', 'department', 'designation', 'isActive', 'role', 'password', 'passwordHash'];
  for (const field of disallowedFields) {
    if (req.body && req.body[field] !== undefined) {
      return res.status(422).json({
        success: false,
        message: `Field "${field}" cannot be modified via self-update. Contact an administrator.`,
        errors: [
          {
            field,
            message: `Modifying "${field}" requires administrator privileges`,
          },
        ],
      });
    }
  }
  next();
};

/**
 * Validation rules for self-service profile updates (PATCH /api/v1/users/me).
 */
export const validateSelfProfileUpdate = [
  checkSelfUpdateMassAssignment,
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_dots: false }),
  body('phone')
    .optional({ nullable: true })
    .isString()
    .withMessage('Phone must be a string')
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),
  body('avatarUrl')
    .optional({ nullable: true })
    .trim()
    .matches(/^https?:\/\/.+$/)
    .withMessage('Avatar URL must be a valid HTTP or HTTPS URL'),
  validateRequest,
];

/**
 * Validation rules for admin user updates (PATCH /api/v1/users/:userId).
 * employeeId is system-generated and immutable (silently ignored).
 */
export const validateAdminUserUpdate = [
  body('department')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('designation')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('role')
    .optional()
    .isIn(ROLES_LIST)
    .withMessage(`Role must be one of: ${ROLES_LIST.join(', ')}`),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  validateRequest,
];

/**
 * Validation rules for user directory query parameters (GET /api/v1/users).
 */
export const validateUserQuery = [
  query('role')
    .optional()
    .isIn(ROLES_LIST)
    .withMessage(`Role must be one of: ${ROLES_LIST.join(', ')}`),
  validateRequest,
];
