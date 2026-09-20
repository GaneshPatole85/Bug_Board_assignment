import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';

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
      const error = new Error('Email already registered');
      error.statusCode = 409;
      error.errors = [{ field: 'email', message: 'Email already registered' }];
      throw error;
    }

    // Explicit safeguard against self-registering as Admin
    if (role === 'Admin') {
      const error = new Error('Admin accounts cannot be self-registered');
      error.statusCode = 422;
      error.errors = [{ field: 'role', message: 'Admin accounts cannot be self-registered' }];
      throw error;
    }

    // User pre-save hook will securely hash passwordHash with cost factor 12
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: password,
      role,
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
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.errors = [{ field: 'auth', message: 'Invalid email or password' }];
      return error;
    };

    const normalizedEmail = (email || '').toLowerCase().trim();

    // Explicitly include passwordHash using .select('+passwordHash')
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      throw genericAuthError();
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw genericAuthError();
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
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user.toJSON();
  }
}

export const authService = new AuthService();
