import { validationResult } from 'express-validator';

/**
 * Validation Error Collector Middleware.
 * Single normalization point for express-validator results across the entire application.
 *
 * Ensures whatever shape express-validator produces internally, what reaches
 * the client is ALWAYS strictly:
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "<fieldName>", "message": "<specificErrorMessage>" }
 *   ]
 * }
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  next();
};
