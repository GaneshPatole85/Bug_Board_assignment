import { userService } from '../services/user.service.js';

export const listUsers = async (req, res, next) => {
  try {
    const users = await userService.listUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
