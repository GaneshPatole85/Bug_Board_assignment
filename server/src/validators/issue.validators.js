import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import {
  ISSUE_SEVERITY_LIST,
  ISSUE_PRIORITY_LIST,
  ISSUE_STATUS_LIST,
} from '../constants/issueWorkflow.js';

const ALLOWED_SORT_FIELDS = [
  'createdAt',
  '-createdAt',
  'priority',
  '-priority',
  'severity',
  '-severity',
  'status',
  '-status',
];

/**
 * Validation rules for issue creation.
 * Reporter is intentionally omitted; it is forced server-side from req.user.id.
 */
export const createIssueValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Issue title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Issue title must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Issue description is required')
    .isLength({ max: 5000 })
    .withMessage('Issue description cannot exceed 5000 characters'),

  body('project')
    .notEmpty()
    .withMessage('Project reference is required')
    .isMongoId()
    .withMessage('Project must be a valid ObjectId'),

  body('severity')
    .optional()
    .isIn(ISSUE_SEVERITY_LIST)
    .withMessage(`Severity must be one of: ${ISSUE_SEVERITY_LIST.join(', ')}`),

  body('priority')
    .optional()
    .isIn(ISSUE_PRIORITY_LIST)
    .withMessage(`Priority must be one of: ${ISSUE_PRIORITY_LIST.join(', ')}`),

  body('assignee')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Assignee must be a valid ObjectId or null');
      }
      return true;
    }),
];

/**
 * Validation rules for general issue updates (title, description, priority, severity).
 * Explicitly rejects status or assignee modifications.
 */
export const updateIssueValidator = [
  param('issueId')
    .isMongoId()
    .withMessage('Invalid issue ID format'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Issue title cannot be empty')
    .isLength({ min: 3, max: 200 })
    .withMessage('Issue title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Issue description cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Issue description cannot exceed 5000 characters'),

  body('severity')
    .optional()
    .isIn(ISSUE_SEVERITY_LIST)
    .withMessage(`Severity must be one of: ${ISSUE_SEVERITY_LIST.join(', ')}`),

  body('priority')
    .optional()
    .isIn(ISSUE_PRIORITY_LIST)
    .withMessage(`Priority must be one of: ${ISSUE_PRIORITY_LIST.join(', ')}`),

  body('status')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error(
          'Status cannot be modified via general PATCH. Use PATCH /api/v1/issues/:issueId/status instead.'
        );
      }
      return true;
    }),

  body('assignee')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error(
          'Assignee cannot be modified via general PATCH. Use PATCH /api/v1/issues/:issueId/assignee instead.'
        );
      }
      return true;
    }),
];

/**
 * Validation rules for dedicated status update endpoint.
 */
export const updateStatusValidator = [
  param('issueId')
    .isMongoId()
    .withMessage('Invalid issue ID format'),

  body('status')
    .notEmpty()
    .withMessage('New status is required')
    .isIn(ISSUE_STATUS_LIST)
    .withMessage(`Status must be one of: ${ISSUE_STATUS_LIST.join(', ')}`),
];

/**
 * Validation rules for dedicated assignee update endpoint.
 */
export const updateAssigneeValidator = [
  param('issueId')
    .isMongoId()
    .withMessage('Invalid issue ID format'),

  body('assignee')
    .custom((value) => {
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Assignee must be a valid ObjectId or null');
      }
      return true;
    }),
];

/**
 * Validation rules for issue query/filter parameters.
 */
export const listIssuesQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer starting at 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('status')
    .optional()
    .isIn(ISSUE_STATUS_LIST)
    .withMessage(`Status filter must be one of: ${ISSUE_STATUS_LIST.join(', ')}`),

  query('priority')
    .optional()
    .isIn(ISSUE_PRIORITY_LIST)
    .withMessage(`Priority filter must be one of: ${ISSUE_PRIORITY_LIST.join(', ')}`),

  query('severity')
    .optional()
    .isIn(ISSUE_SEVERITY_LIST)
    .withMessage(`Severity filter must be one of: ${ISSUE_SEVERITY_LIST.join(', ')}`),

  query('project')
    .optional()
    .isMongoId()
    .withMessage('Project filter must be a valid ObjectId format'),

  query('reporter')
    .optional()
    .isMongoId()
    .withMessage('Reporter filter must be a valid ObjectId format'),

  query('assignee')
    .optional()
    .custom((value) => {
      if (value === 'unassigned' || mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }
      throw new Error('Assignee filter must be a valid ObjectId format or "unassigned"');
    }),

  query('sort')
    .optional()
    .isIn(ALLOWED_SORT_FIELDS)
    .withMessage(`Sort field must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`),
];

/**
 * Validation for issue ID URL parameter.
 */
export const issueIdParamValidator = [
  param('issueId')
    .isMongoId()
    .withMessage('Invalid issue ID format'),
];
