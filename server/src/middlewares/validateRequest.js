import { validationResult } from 'express-validator';

/**
 * Validation Error Collector Middleware.
 * Inspects express-validator results on the request.
 * If validation errors exist, formats them consistently and returns HTTP 422.
 * If valid, hands control to next middleware in chain.
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  next();
};
