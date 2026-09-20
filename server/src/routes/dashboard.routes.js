import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { getDashboard, getDashboardSummary } from '../controllers/dashboard.controller.js';

const router = Router();

// All dashboard metrics require authentication
router.use(authenticate);

// GET /api/v1/dashboard/summary — Phase 4 specification: totals & assignedToMe
router.get('/summary', getDashboardSummary);

// GET /api/v1/dashboard — Full dashboard metrics
router.get('/', getDashboard);

export default router;
