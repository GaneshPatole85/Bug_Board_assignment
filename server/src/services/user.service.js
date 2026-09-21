import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { ROLES } from '../constants/roles.js';
import { counterService } from './counter.service.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

class UserService {
  /**
   * List users for directory and selection.
   * Admins see all users with profile attributes and support role filtering.
   * Non-admins only see non-admin users sharing their projects.
   * @param {Object} user - Requesting user from req.user
   * @param {Object} [query] - Query options (e.g. role)
   */
  async listUsers(user, query = {}) {
    if (!user || user.role === ROLES.ADMIN) {
      const filter = {};
      if (query.role) {
        filter.role = query.role;
      }
      return User.find(filter)
        .select('_id name email role employeeId department designation phone avatarUrl isActive createdAt')
        .sort({ name: 1 });
    }

    // For Developers and Testers: find all projects the user belongs to
    const accessibleProjects = await Project.find({ members: user.id }).select('members');
    const memberIdSet = new Set();
    accessibleProjects.forEach((proj) => {
      (proj.members || []).forEach((mId) => memberIdSet.add(mId.toString()));
    });

    const memberIds = Array.from(memberIdSet);

    // Return only non-admin users in shared projects
    return User.find({
      _id: { $in: memberIds },
      role: { $ne: ROLES.ADMIN },
    })
      .select('_id name email role employeeId department designation phone avatarUrl isActive createdAt')
      .sort({ name: 1 });
  }

  /**
   * Retrieve single user full profile (Admin only).
   */
  async getUserById(userId) {
    const user = await User.findById(userId)
      .select('_id name email role employeeId department designation phone avatarUrl isActive createdAt');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Self-service profile update for currently logged in user.
   * Allowed fields: name, email, phone, avatarUrl.
   * Email is unique across the system — duplicate check is enforced.
   */
  async updateSelfProfile(userId, data) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Email change: validate uniqueness before saving
    if (data.email !== undefined && data.email !== user.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: userId } }).lean();
      if (existing) {
        throw new ConflictError('Email address is already in use by another account');
      }
      user.email = data.email;
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;

    await user.save();
    return user.toJSON();
  }

  /**
   * Generates a unique, sequential, role-prefixed employee ID using atomic counter.
   * @param {string} role - 'Admin' | 'Developer' | 'Tester'
   * @returns {Promise<string>}
   */
  async generateEmployeeId(role) {
    return counterService.generateEmployeeId(role);
  }

  /**
   * Administrative user update (Admin only).
   * Allowed fields: department, role, designation, isActive.
   * employeeId is system-generated and immutable (silently ignored if provided).
   * Enforces blanket self-edit prohibition.
   */
  async updateUserAsAdmin(targetUserId, adminUserId, data) {
    // Blanket guard: Administrators cannot modify their own record via admin management route
    if (targetUserId.toString() === adminUserId.toString()) {
      throw new ForbiddenError(
        'Use your profile page to update your own information; administrators cannot edit their own organizational record through this endpoint.'
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // employeeId is immutable by system design - ignored if passed in data

    if (data.department !== undefined) {
      user.department = data.department;
      user.designation = data.department;
    } else if (data.designation !== undefined) {
      user.designation = data.designation;
      user.department = data.designation;
    }

    if (data.role !== undefined) {
      if (data.role === ROLES.ADMIN) {
        throw new ForbiddenError(
          'Promoting users to Admin is not permitted. Only the primary administrator holds administrative access.'
        );
      }
      user.role = data.role;
    }

    if (data.isActive !== undefined) {
      user.isActive = Boolean(data.isActive);
    }

    await user.save();
    return user.toJSON();
  }
}

export const userService = new UserService();
export const generateEmployeeId = (role) => counterService.generateEmployeeId(role);
export default userService;
