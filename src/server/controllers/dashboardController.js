import { asyncHandler } from '../helpers/asyncWrapper.js';
import { getDashboardData } from '../service/dashboardService.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const dashboard = await getDashboardData(req.userId, days);
  return res.json({ dashboard });
});
