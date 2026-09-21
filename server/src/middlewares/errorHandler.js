import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Centralized Application Error Handling Middleware.
 * Catches all errors forwarded by next(err) and formats them into
 * the exact normalized JSON envelope: { success: false, message, errors }.
 *
 * Security: Under NO circumstance does any 500 error leak stack traces
 * or internal driver details in the response body, regardless of NODE_ENV.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors = [];

  // 1. AppError (or subclass) — Operational expected errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = Array.isArray(err.errors) ? err.errors : [];
  }
  // 2. Mongoose CastError (typically a malformed ObjectId) -> 400 Bad Request
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
    errors = [{ field: err.path, message: `Invalid ID format for ${err.path}` }];
  }
  // 3. Mongoose ValidationError -> 422 Unprocessable Entity
  else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }
  // 4. MongoDB duplicate key error (code 11000) -> 409 Conflict
  else if (err.code === 11000) {
    statusCode = 409;
    const duplicateKey = Object.keys(err.keyValue || {})[0] || 'field';
    const friendlyName = duplicateKey === 'key' ? 'project key' : duplicateKey;
    message = `${friendlyName} already in use`;
    errors = [{ field: duplicateKey, message: `${friendlyName} already in use` }];
  }
  // 5. jsonwebtoken errors (expired / malformed) -> 401 Unauthorized
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Unauthorized: Token has expired';
    errors = [{ field: 'token', message: 'Token has expired' }];
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized: Invalid token';
    errors = [{ field: 'token', message: 'Invalid authentication token' }];
  }
  // 6. Anything else (a genuine programmer bug / unexpected system failure)
  else {
    statusCode = err.statusCode || 500;
    // If it was explicitly marked with a 4xx statusCode on a raw Error, keep message
    if (statusCode >= 400 && statusCode < 500) {
      message = err.message || 'Request failed';
      errors = Array.isArray(err.errors) ? err.errors : [];
    } else {
      // Genuine 500: Log full error with stack trace via pino at error level
      logger.error(
        {
          err: {
            message: err.message,
            stack: err.stack,
            statusCode,
          },
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          query: req.query,
        },
        `Unhandled Server Error: ${err.message}`
      );

      // Never leak stack trace or internal error messages in response body
      statusCode = 500;
      message = 'Internal server error';
      errors = [];
    }
  }

  // 7. Every response from this handler uses the exact { success: false, message, errors } shape
  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
