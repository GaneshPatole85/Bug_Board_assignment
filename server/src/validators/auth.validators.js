import { body } from 'express-validator';

/**
 * Validation rules for user registration.
 * Explicitly rejects role: 'Admin' (only Developer or Tester allowed for self-service registration).
 */
export const registerValidator = [
  body('name')
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .custom((value) => {
      if (value === 'Admin') {
        throw new Error('Admin accounts cannot be self-registered. Permitted roles are Developer or Tester.');
      }
      if (!['Developer', 'Tester'].includes(value)) {
        throw new Error('Role must be either Developer or Tester');
      }
      return true;
    }),
];

/**
 * Validation rules for user login.
 */
export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for changing password while logged in.
 */
export const changePasswordValidator = [
  body('currentPassword')
    .isString()
    .withMessage('Current password must be a string')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isString()
    .withMessage('New password must be a string')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('confirmNewPassword')
    .isString()
    .withMessage('Confirm new password must be a string')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    }),
];

/**
 * Validation rules for initiating a forgot password request.
 */
export const forgotPasswordValidator = [
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Validation rules for completing a password reset using token.
 */
export const resetPasswordValidator = [
  body('token')
    .isString()
    .withMessage('Reset token must be a string')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .isString()
    .withMessage('New password must be a string')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('confirmNewPassword')
    .isString()
    .withMessage('Confirm new password must be a string')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    }),
];

