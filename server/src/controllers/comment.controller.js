import { commentService } from '../services/comment.service.js';

/**
 * POST /api/v1/issues/:issueId/comments
 * Add an immutable comment to an issue.
 */
export const createComment = async (req, res, next) => {
  try {
    const comment = await commentService.createComment(
      req.params.issueId,
      req.user,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/issues/:issueId/comments
 * Retrieve paginated comments for an issue in chronological order.
 */
export const listComments = async (req, res, next) => {
  try {
    const result = await commentService.listComments(
      req.params.issueId,
      req.user,
      req.query
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
