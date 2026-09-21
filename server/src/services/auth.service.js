import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { generateEmployeeId } from './user.service.js';
import { notificationService } from './notification.service.js';
import {
  BadRequestError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors.js';

// Pre-computed bcrypt hash (cost factor 12) for constant-time comparison on invalid emails
const DUMMY_BCRYPT_HASH = '$2a$12$e8uq0eR50a7NfHhYl0mNpe0N3uJ1Bcv89k0z2f5E4O6y1W7qZ2K2y';

export class AuthService {
  /**
   * Register a new Developer or Tester.
   * Admin accounts cannot be self-registered (enforced at validator and service level).
   * @param {Object} data - { name, email, password, role }
   * @returns {Promise<Object>} Created user without passwordHash
   */
  async registerUser({ name, email, password, role }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('Email already registered', [
        { field: 'email', message: 'Email already registered' },
      ]);
    }

    // Explicit safeguard against self-registering as Admin
    if (role === 'Admin') {
      throw new ValidationError('Admin accounts cannot be self-registered', [
        { field: 'role', message: 'Admin accounts cannot be self-registered' },
      ]);
    }

    // Generate atomic, race-safe, sequential role-prefixed employeeId (e.g. DEV-0001, TST-0001)
    const employeeId = await generateEmployeeId(role);

    // User pre-save hook will securely hash passwordHash with cost factor 12
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: password,
      role,
      employeeId,
    });

    await user.save();

    // Fire-and-forget notification dispatch (welcome email + admin alert)
    notificationService.notifyRegistration({ user });

    // Return sanitized plain object (toJSON strips passwordHash)
    return user.toJSON();
  }

  /**
   * Authenticate user credentials and issue stateless JWT token.
   * Returns generic 401 error on any failure to prevent user enumeration.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ token: string, user: Object }>}
   */
  async loginUser({ email, password }) {
    const genericAuthError = () => {
      return new UnauthorizedError('Invalid email or password');
    };

    const normalizedEmail = (email || '').toLowerCase().trim();

    // Explicitly include passwordHash using .select('+passwordHash')
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      // Execute dummy comparison to ensure constant-time response window (prevents timing enumeration)
      await bcrypt.compare(password || '', DUMMY_BCRYPT_HASH);
      throw genericAuthError();
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw genericAuthError();
    }

    if (user.isActive === false) {
      throw new UnauthorizedError('Your account has been deactivated. Contact an administrator.');
    }

    const tokenPayload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const token = signToken(tokenPayload);

    return {
      token,
      user: user.toJSON(),
    };
  }

  /**
   * Retrieve current user profile by ID without password.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
  }

  /**
   * Change password for an authenticated user.
   * Invalidates existing sessions by updating passwordChangedAt.
   * @param {Object} params - { userId, currentPassword, newPassword }
   */
  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password against stored hash
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new ValidationError('Current password is incorrect', [
        { field: 'currentPassword', message: 'Current password is incorrect' },
      ]);
    }

    // Verify new password differs from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password', [
        { field: 'newPassword', message: 'New password must be different from current password' },
      ]);
    }

    // Update password and record change timestamp for session invalidation
    user.passwordHash = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    return {
      success: true,
      message: 'Password updated successfully. Please sign in again for security.',
    };
  }

  /**
   * Request password reset token and dispatch email.
   * Always returns identical generic success message to prevent user enumeration.
   * @param {Object} params - { email }
   */
  async requestPasswordReset({ email }) {
    const GENERIC_SUCCESS_MSG = 'If an account with that email exists, a reset link has been sent.';

    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return { success: true, message: GENERIC_SUCCESS_MSG };
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration: Only generate token and email if active user exists
    if (user && user.isActive !== false) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
      await user.save();

      // Dispatch reset email (fire-and-forget)
      notificationService.sendPasswordResetEmail({ user, token: rawToken });
    }

    return {
      success: true,
      message: GENERIC_SUCCESS_MSG,
    };
  }

  /**
   * Reset password using token from reset email link.
   * Token is single-use and cleared immediately upon use.
   * @param {Object} params - { token, newPassword }
   */
  async resetPassword({ token, newPassword }) {
    if (!token) {
      throw new BadRequestError('This reset link is invalid or has expired', [
        { field: 'token', message: 'This reset link is invalid or has expired' },
      ]);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordHash');

    if (!user) {
      throw new BadRequestError('This reset link is invalid or has expired', [
        { field: 'token', message: 'This reset link is invalid or has expired' },
      ]);
    }

    user.passwordHash = newPassword;
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    return {
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    };
  }
}

export const authService = new AuthService();
