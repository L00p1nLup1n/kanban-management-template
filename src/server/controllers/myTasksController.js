import { asyncHandler } from '../helpers/asyncWrapper.js';
import { getMyTasks } from '../service/myTasksService.js';

export const getMyTasksList = asyncHandler(async (req, res) => {
  const projects = await getMyTasks(req.userId);
  return res.json({ projects });
});
