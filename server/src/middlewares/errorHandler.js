import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Centralized Application Error Handling Middleware.
 * Catches all errors forwarded by next(err) and formats them into
 * the standard JSON envelope: { success: false, message, errors }.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);

  // Structured logging of unhandled errors
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
    `Request Error: ${err.message}`
  );

  // Mongoose validation error normalization
  let errors = err.errors || [];
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError' && err.errors) {
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    message = 'Validation failed';
  } else if (err.code === 11000) {
    // Duplicate key error
    const duplicateKey = Object.keys(err.keyValue || {})[0];
    message = `Duplicate field value entered for: ${duplicateKey}`;
    errors = [{ field: duplicateKey, message: `${duplicateKey} must be unique` }];
  } else if (err.name === 'CastError') {
    message = `Invalid format for field: ${err.path}`;
    errors = [{ field: err.path, message: `Invalid ObjectId or value format` }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    ...(env.isDevelopment && { stack: err.stack }),
  });
};
