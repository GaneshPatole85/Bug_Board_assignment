import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { generateEmployeeId } from './user.service.js';
import {
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
}

export const authService = new AuthService();
