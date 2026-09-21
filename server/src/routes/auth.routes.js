import { Router } from 'express';
import {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/auth.validators.js';
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

/**
 * @route   PATCH /api/v1/auth/change-password
 * @desc    Self-service change password for authenticated user (invalidates existing sessions)
 * @access  Private (Requires valid Bearer token)
 */
router.patch(
  '/change-password',
  authenticate,
  changePasswordValidator,
  validateRequest,
  changePassword
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Initiate password reset (anti-enumeration: identical generic response always)
 * @access  Public (Rate-limited)
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  forgotPasswordValidator,
  validateRequest,
  forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Complete password reset with single-use crypto token
 * @access  Public (Rate-limited)
 */
router.post(
  '/reset-password',
  authRateLimiter,
  resetPasswordValidator,
  validateRequest,
  resetPassword
);

export default router;

