import { body, query, param } from 'express-validator';

/**
 * Validation rules for creating a comment on an issue.
 */
export const createCommentValidator = [
  param('issueId')
    .isMongoId()
    .withMessage('Invalid issue ID format'),

  body('content')
    .isString()
    .withMessage('Comment content must be a string')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
];

/**
 * Validation rules for listing comments.
 */
export const listCommentsQueryValidator = [
  param('issueId')
    .isMongoId()
    .withMessage('Invalid issue ID format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer >= 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];
