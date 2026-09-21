import { userService } from '../services/user.service.js';

export const listUsers = async (req, res, next) => {
  try {
    const users = await userService.listUsers(req.user, req.query);
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const profile = await userService.getUserById(req.user.id);
    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const updated = await userService.updateSelfProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserAsAdmin = async (req, res, next) => {
  try {
    const updated = await userService.updateUserAsAdmin(
      req.params.userId,
      req.user.id,
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'User account updated successfully',
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
};
