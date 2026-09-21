import { User } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication Middleware.
 * Reads Authorization header, verifies JWT, validates active account status from DB,
 * and attaches user { id, role } to req.user.
 * Logs specific error causes while returning safe, structured 401 responses.
 */
export const authenticate = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn({ ip: req.ip, path: req.originalUrl }, 'Auth failure: Malformed Authorization header format');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token format',
        errors: [],
      });
    }
    token = parts[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    logger.warn({ ip: req.ip, path: req.originalUrl }, 'Auth failure: Missing Authorization header');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token is missing',
      errors: [],
    });
  }

  try {
    const decoded = verifyToken(token);

    // Look up user status in database to immediately enforce deactivations
    const userDoc = await User.findById(decoded.sub).select('role isActive').lean();
    if (!userDoc) {
      logger.warn({ ip: req.ip, path: req.originalUrl, userId: decoded.sub }, 'Auth failure: User account no longer exists');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User account no longer exists',
        errors: [],
      });
    }

    if (userDoc.isActive === false) {
      logger.warn({ ip: req.ip, path: req.originalUrl, userId: decoded.sub }, 'Auth failure: Deactivated account access attempt');
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator.',
        errors: [],
      });
    }

    // Minimal claims attached to req.user
    req.user = {
      id: decoded.sub,
      role: userDoc.role || decoded.role,
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
