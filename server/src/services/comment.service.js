import { Comment } from '../models/Comment.js';
import { Issue } from '../models/Issue.js';
import { Project } from '../models/Project.js';
import { ROLES } from '../constants/roles.js';

class CommentService {
  /**
   * Helper to verify that an issue exists and the user is authorized to access its parent project.
   * Admin has universal access; non-admins must be a member of the project.
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

      const userIdStr = user.id.toString();
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
   * Add a new comment to an issue.
   * Author is strictly enforced as the authenticated user (anti-spoofing).
   */
  async createComment(issueId, user, { content }) {
    await this._verifyIssueAndProjectAccess(issueId, user);

    const comment = await Comment.create({
      issue: issueId,
      author: user.id, // Strictly server-enforced, cannot be spoofed by client payload
      content: content.trim(),
    });

    return Comment.findById(comment._id).populate('author', '_id name email role');
  }

  /**
   * List paginated comments for an issue, ordered oldest-first (createdAt: 1)
   * to read chronologically top-to-bottom like a conversation thread.
   */
  async listComments(issueId, user, { page = 1, limit = 20 } = {}) {
    await this._verifyIssueAndProjectAccess(issueId, user);

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [comments, total] = await Promise.all([
      Comment.find({ issue: issueId })
        .sort({ createdAt: 1 }) // Chronological order
        .skip(skip)
        .limit(safeLimit)
        .populate('author', '_id name email role'),
      Comment.countDocuments({ issue: issueId }),
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 0;

    return {
      data: comments,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    };
  }
}

export const commentService = new CommentService();
export default commentService;
