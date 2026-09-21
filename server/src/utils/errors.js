/**
 * Custom Error Class Hierarchy for BugBoard Application.
 * Distinguishes operational (expected) errors from programmer bugs.
 */

export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {Array<{field?: string, message: string}>} errors - Field-level details
   */
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.isOperational = true; // Marks error as expected operational error

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request — Malformed request syntax or invalid parameters
 */
export class BadRequestError extends AppError {
  constructor(msg = 'Bad request', errors = []) {
    super(msg, 400, errors);
  }
}

/**
 * 422 Unprocessable Entity — Input validation failures
 */
export class ValidationError extends AppError {
  constructor(msg = 'Validation failed', errors = []) {
    super(msg, 422, errors);
  }
}

/**
 * 401 Unauthorized — Missing, expired, or invalid authentication credentials
 */
export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') {
    super(msg, 401, []);
  }
}

/**
 * 403 Forbidden — Authenticated user lacks permission for the resource
 */
export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') {
    super(msg, 403, []);
  }
}

/**
 * 404 Not Found — Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(msg = 'Resource not found') {
    super(msg, 404, []);
  }
}

/**
 * 409 Conflict — Request conflicts with current state (e.g. duplicate unique key)
 */
export class ConflictError extends AppError {
  constructor(msg = 'Resource conflict', errors = []) {
    super(msg, 409, errors);
  }
}
