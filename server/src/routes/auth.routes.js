import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator } from '../validators/auth.validators.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new Developer or Tester account (Admin rejected)
 * @access  Public (Rate-limited)
 */
router.post('/register', authRateLimiter, registerValidator, validateRequest, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user credentials and receive signed JWT
 * @access  Public (Rate-limited)
 */
router.post('/login', authRateLimiter, loginValidator, validateRequest, login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Retrieve authenticated user profile
 * @access  Private (Requires valid Bearer token)
 */
router.get('/me', authenticate, getMe);

export default router;
