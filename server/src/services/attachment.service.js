import crypto from 'crypto';
import path from 'path';
import { Attachment } from '../models/Attachment.js';
import { Issue } from '../models/Issue.js';
import { Project } from '../models/Project.js';
import { ROLES } from '../constants/roles.js';
import { storageService } from './storage.service.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_MIME_TYPES = Object.freeze(
  new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
  ])
);

class AttachmentService {
  /**
   * Helper to verify that an issue exists and user has project membership
   * @private
   */
  async _verifyIssueAndProjectAccess(issueId, user) {
    const issue = await Issue.findById(issueId).select('_id project');
    if (!issue) {
      const error = new Error('Issue not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== ROLES.ADMIN) {
      if (!issue.project) {
        const error = new Error('Project associated with this issue is unavailable');
        error.statusCode = 404;
        throw error;
      }

      const project = await Project.findById(issue.project).select('members');
      if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
      }

      const userIdStr = (user.id || user._id).toString();
      const isMember = (project.members || []).some((mId) => mId.toString() === userIdStr);

      if (!isMember) {
        const error = new Error('Forbidden: You do not have access to this project');
        error.statusCode = 403;
        throw error;
      }
    }

    return issue;
  }

  /**
   * Upload an attachment to an issue
   */
  async uploadAttachment(issueId, user, file) {
    if (!file) {
      const error = new Error('No file uploaded');
      error.statusCode = 400;
      throw error;
    }

    // 1. Verify project authorization
    await this._verifyIssueAndProjectAccess(issueId, user);

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error(
        `Disallowed file type: ${file.mimetype}. Allowed types include images (PNG, JPEG, WebP, GIF, SVG) and documents (PDF, TXT, CSV, JSON).`
      );
      error.statusCode = 422;
      throw error;
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const error = new Error(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 5 MB.`
      );
      error.statusCode = 422;
      throw error;
    }

    // 4. Generate unique storage key (never trust client filename for storage path)
    const ext = path.extname(file.originalname) || '';
    const storageKey = `${crypto.randomUUID()}${ext}`;

    // 5. Store file
    await storageService.uploadFile(storageKey, file.buffer, file.mimetype);

    // 6. Save Attachment metadata
    const attachment = await Attachment.create({
      issue: issueId,
      uploader: user.id || user._id,
      originalFilename: path.basename(file.originalname).slice(0, 255),
      storageKey,
      mimeType: file.mimetype,
      size: file.size,
    });

    return Attachment.findById(attachment._id).populate('uploader', '_id name email role');
  }

  /**
   * List all attachments for an issue
   */
  async listAttachments(issueId, user) {
    await this._verifyIssueAndProjectAccess(issueId, user);

    const attachments = await Attachment.find({ issue: issueId })
      .sort({ createdAt: -1 })
      .populate('uploader', '_id name email role');

    return attachments;
  }

  /**
   * Retrieve an attachment file buffer and metadata for authorized download
   */
  async getAttachmentForDownload(attachmentId, user) {
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      const error = new Error('Attachment not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access to parent issue's project
    await this._verifyIssueAndProjectAccess(attachment.issue, user);

    const fileBuffer = await storageService.downloadFile(attachment.storageKey);
    return { attachment, fileBuffer };
  }
}

export const attachmentService = new AttachmentService();
export default attachmentService;
