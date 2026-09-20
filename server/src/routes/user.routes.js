import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { listUsers } from '../controllers/user.controller.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users — Authenticated user list for project member selection
router.get('/', listUsers);

export default router;
