import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * General API Rate Limiter scaffold.
 * Configured via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS.
 * Note: Scaffolded in Phase 1; targeted application (e.g. auth routes) happens in Phase 2.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    errors: [
      {
        field: 'rateLimit',
        message: 'Rate limit threshold exceeded.',
      },
    ],
  },
});

/**
 * Stricter Auth Rate Limiter scaffold for Phase 2 login/register endpoints.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    errors: [
      {
        field: 'auth',
        message: 'Authentication rate limit reached.',
      },
    ],
  },
});
