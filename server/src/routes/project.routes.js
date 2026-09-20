import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorizeRole.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { ROLES } from '../constants/roles.js';
import {
  createProjectValidator,
  updateProjectValidator,
  projectIdParamValidator,
} from '../validators/project.validators.js';
import {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// POST /api/v1/projects — Admin only
router.post(
  '/',
  authorizeRole(ROLES.ADMIN),
  createProjectValidator,
  validateRequest,
  createProject
);

// GET /api/v1/projects — Authenticated (Admin sees all, non-admins see member projects)
router.get('/', listProjects);

// GET /api/v1/projects/:projectId — Admin or member of project
router.get(
  '/:projectId',
  projectIdParamValidator,
  validateRequest,
  getProjectById
);

// PATCH /api/v1/projects/:projectId — Admin only
router.patch(
  '/:projectId',
  authorizeRole(ROLES.ADMIN),
  updateProjectValidator,
  validateRequest,
  updateProject
);

// DELETE /api/v1/projects/:projectId — Admin only
router.delete(
  '/:projectId',
  authorizeRole(ROLES.ADMIN),
  projectIdParamValidator,
  validateRequest,
  deleteProject
);

export default router;
