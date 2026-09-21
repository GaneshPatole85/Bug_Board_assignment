import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorizeRole.js';
import { ROLES } from '../constants/roles.js';
import {
  listUsers,
  getMe,
  updateMe,
  getUserById,
  updateUserAsAdmin,
} from '../controllers/user.controller.js';
import {
  validateSelfProfileUpdate,
  validateAdminUserUpdate,
  validateUserQuery,
} from '../validators/user.validators.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Self-service profile routes (accessible to any authenticated role)
router.get('/me', getMe);
router.patch('/me', validateSelfProfileUpdate, updateMe);

// User directory routes (Admins see all; Non-admins see co-members without Admin accounts)
router.get('/', validateUserQuery, listUsers);
router.get('/:userId', authorizeRole(ROLES.ADMIN), getUserById);
router.patch('/:userId', authorizeRole(ROLES.ADMIN), validateAdminUserUpdate, updateUserAsAdmin);

export default router;
