import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authenticate.js';
import {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
} from '../controllers/attachment.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const router = Router();

// All attachment routes require authentication
router.use(authenticate);

// GET /api/v1/attachments/:attachmentId/download — Download file
router.get('/:attachmentId/download', downloadAttachment);

export default router;
export { upload, uploadAttachment, listAttachments };
