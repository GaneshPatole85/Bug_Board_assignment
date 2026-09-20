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
  createCommentValidator,
  listCommentsQueryValidator,
} from '../validators/comment.validators.js';
import {
  createIssue,
  listIssues,
  getIssueById,
  updateIssue,
  updateIssueStatus,
  updateIssueAssignee,
  getIssueActivities,
  deleteIssue,
} from '../controllers/issue.controller.js';
import {
  createComment,
  listComments,
} from '../controllers/comment.controller.js';
import {
  upload,
  uploadAttachment,
  listAttachments,
} from './attachment.routes.js';

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

// GET /api/v1/issues/:issueId/activities & /activity — Retrieve status/assignee audit history
router.get(
  '/:issueId/activities',
  issueIdParamValidator,
  validateRequest,
  getIssueActivities
);
router.get(
  '/:issueId/activity',
  issueIdParamValidator,
  validateRequest,
  getIssueActivities
);

// POST /api/v1/issues/:issueId/comments — Add a comment to an issue
router.post(
  '/:issueId/comments',
  createCommentValidator,
  validateRequest,
  createComment
);

// GET /api/v1/issues/:issueId/comments — Retrieve paginated comments (oldest-first)
router.get(
  '/:issueId/comments',
  listCommentsQueryValidator,
  validateRequest,
  listComments
);

// POST /api/v1/issues/:issueId/attachments — Upload file attachment
router.post(
  '/:issueId/attachments',
  upload.single('file'),
  uploadAttachment
);

// GET /api/v1/issues/:issueId/attachments — List issue attachments
router.get(
  '/:issueId/attachments',
  listAttachments
);

// DELETE /api/v1/issues/:issueId — Admin or Reporter only
router.delete(
  '/:issueId',
  issueIdParamValidator,
  validateRequest,
  deleteIssue
);

export default router;
