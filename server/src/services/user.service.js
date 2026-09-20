import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { ROLES } from '../constants/roles.js';

class UserService {
  /**
   * List active users for member selection and assignment.
   * Admins see all users. Non-admins only see users sharing their projects, excluding Admins.
   * @param {Object} [user] - Requesting user from req.user
   */
  async listUsers(user) {
    if (!user || user.role === ROLES.ADMIN) {
      return User.find({}).select('_id name email role').sort({ name: 1 });
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
      .select('_id name email role')
      .sort({ name: 1 });
  }
}

export const userService = new UserService();
export default userService;
