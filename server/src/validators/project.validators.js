import { body, param } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Validation rules for project creation (Admin only).
 */
export const createProjectValidator = [
  body('name')
    .isString()
    .withMessage('Project name must be a string')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),

  body('key')
    .isString()
    .withMessage('Project key must be a string')
    .trim()
    .notEmpty()
    .withMessage('Project key is required')
    .toUpperCase()
    .isLength({ min: 2, max: 10 })
    .withMessage('Project key must be between 2 and 10 characters')
    .matches(/^[A-Z0-9-]{2,10}$/)
    .withMessage('Project key must contain only uppercase alphanumeric characters or hyphens')
    .custom((val) => {
      if (val.startsWith('-') || val.endsWith('-')) {
        throw new Error('Project key cannot start or end with a hyphen');
      }
      if (!/[A-Z0-9]/.test(val)) {
        throw new Error('Project key must contain at least one letter or number');
      }
      return true;
    }),

  body('description')
    .optional({ checkFalsy: false })
    .isString()
    .withMessage('Project description must be a string')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Project description cannot exceed 500 characters'),

  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array of user IDs')
    .custom((members) => {
      for (const memberId of members) {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
          throw new Error(`Invalid member user ID format: ${memberId}`);
        }
      }
      return true;
    }),
];

/**
 * Validation rules for project updates (Admin only).
 */
export const updateProjectValidator = [
  param('projectId')
    .isMongoId()
    .withMessage('Invalid project ID format'),

  body('name')
    .optional()
    .isString()
    .withMessage('Project name must be a string')
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),

  body('description')
    .optional({ checkFalsy: false })
    .isString()
    .withMessage('Project description must be a string')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Project description cannot exceed 500 characters'),

  body('members')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Members must be a non-empty array of user IDs')
    .custom((members) => {
      for (const memberId of members) {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
          throw new Error(`Invalid member user ID format: ${memberId}`);
        }
      }
      return true;
    }),

  body('key')
    .custom((key) => {
      if (key !== undefined) {
        throw new Error('Project key is immutable and cannot be updated.');
      }
      return true;
    }),
];

/**
 * Validation rules for project ID URL parameter.
 */
export const projectIdParamValidator = [
  param('projectId')
    .isMongoId()
    .withMessage('Invalid project ID format'),
];
