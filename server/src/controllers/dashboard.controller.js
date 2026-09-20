import { dashboardService } from '../services/dashboard.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardMetrics(req.user);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
