import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

// All dashboard metrics require authentication
router.use(authenticate);

// GET /api/v1/dashboard
router.get('/', getDashboard);

export default router;
