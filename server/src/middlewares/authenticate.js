import { verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Middleware.
 * Reads Authorization header, verifies JWT, and attaches user { id, role } to req.user.
 * Logs specific error causes while returning a safe, generic 401 response to callers.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn({ ip: req.ip, path: req.originalUrl }, 'Auth failure: Missing Authorization header');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token is missing',
      errors: [],
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn({ ip: req.ip, path: req.originalUrl }, 'Auth failure: Malformed Authorization header format');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token format',
      errors: [],
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);

    // Minimal claims attached to req.user (no PII)
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.warn({ ip: req.ip, path: req.originalUrl, expiredAt: err.expiredAt }, 'Auth failure: Token expired');
    } else if (err.name === 'JsonWebTokenError') {
      logger.warn({ ip: req.ip, path: req.originalUrl, reason: err.message }, 'Auth failure: Invalid token signature or payload');
    } else {
      logger.error({ err }, 'Auth failure: Unexpected token verification error');
    }

    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
      errors: [],
    });
  }
};
