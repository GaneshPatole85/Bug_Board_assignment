import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/v1/notifications — List notifications for authenticated user
router.get('/', listNotifications);

// PATCH /api/v1/notifications/read-all — Mark all user notifications as read
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/v1/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', markNotificationRead);

export default router;
