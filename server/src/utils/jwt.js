import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Sign a JSON Web Token with minimal, privacy-conscious claims (no PII).
 * @param {Object} payload - { sub: string, role: string }
 * @param {string} [expiresIn] - Optional custom expiry
 * @returns {string} Signed JWT
 */
export const signToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  const plainPayload =
    payload && typeof payload.toObject === 'function'
      ? { sub: payload._id.toString(), role: payload.role }
      : payload && payload._id
      ? { sub: payload._id.toString(), role: payload.role }
      : payload && payload.sub
      ? { sub: payload.sub.toString(), role: payload.role }
      : payload;

  return jwt.sign(plainPayload, env.JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
  });
};

/**
 * Verify a JSON Web Token and return decoded claims.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
};
