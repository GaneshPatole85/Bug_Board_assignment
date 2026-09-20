import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createIssueValidator,
  updateIssueValidator,
  updateStatusValidator,
  updateAssigneeValidator,
  listIssuesQueryValidator,
  issueIdParamValidator,
} from '../validators/issue.validators.js';
import {
  createIssue,
  listIssues,
  getIssueById,
  updateIssue,
  updateIssueStatus,
  updateIssueAssignee,
  getIssueActivities,
} from '../controllers/issue.controller.js';

const router = Router();

// All issue routes require authentication
router.use(authenticate);

// POST /api/v1/issues — Authenticated user (must have access to target project)
router.post('/', createIssueValidator, validateRequest, createIssue);

// GET /api/v1/issues — Authenticated user (scoped to accessible projects, filters, pagination, search)
router.get('/', listIssuesQueryValidator, validateRequest, listIssues);

// GET /api/v1/issues/:issueId — Authenticated user with project access
router.get('/:issueId', issueIdParamValidator, validateRequest, getIssueById);

// PATCH /api/v1/issues/:issueId — Edit title, description, priority, severity
router.patch('/:issueId', updateIssueValidator, validateRequest, updateIssue);

// PATCH /api/v1/issues/:issueId/status — Enforces status transition engine & writes Activity
router.patch(
  '/:issueId/status',
  updateStatusValidator,
  validateRequest,
  updateIssueStatus
);

// PATCH /api/v1/issues/:issueId/assignee — Validates project membership & writes Activity
router.patch(
  '/:issueId/assignee',
  updateAssigneeValidator,
  validateRequest,
  updateIssueAssignee
);

// GET /api/v1/issues/:issueId/activities — Retrieve status/assignee audit history
router.get(
  '/:issueId/activities',
  issueIdParamValidator,
  validateRequest,
  getIssueActivities
);

export default router;
