import { User } from '../models/User.js';

class UserService {
  /**
   * List active users for member selection.
   * Returns user ID, name, email, and role.
   */
  async listUsers() {
    return User.find({}).select('_id name email role').sort({ name: 1 });
  }
}

export const userService = new UserService();
export default userService;
