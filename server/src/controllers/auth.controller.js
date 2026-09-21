import { authService } from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await authService.registerUser({ name, email, password, role });

    // 201 Created — per deliberate design choice, registration does not auto-login
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please proceed to login.',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Current user profile retrieved successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset({ email });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

