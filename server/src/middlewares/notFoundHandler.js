/**
 * 404 Not Found Middleware.
 * Catches all unmatched routes and returns standard JSON error shape.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
};
