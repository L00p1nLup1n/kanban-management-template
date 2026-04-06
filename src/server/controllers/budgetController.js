import { asyncHandler } from '../helpers/asyncWrapper.js';
import { ProjectError } from '../errors/error.js';
import {
  findProjectById,
  getProjectBudget,
} from '../service/projectService.js';
import { userHasProjectAccess } from '../utils/authUtils.js';

export const getBudget = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  const project = await findProjectById(projectId);
  if (!project) throw new ProjectError(404, 'Project not found');
  if (!userHasProjectAccess(project, userId))
    throw new ProjectError(403, 'Forbidden');

  const { tasksWithCost, totalCost } = await getProjectBudget(projectId);
  const budget = project.budget ?? null;

  return res.json({
    budget,
    totalCost,
    remaining: budget != null ? budget - totalCost : null,
    tasks: tasksWithCost.map((t) => ({
      _id: t._id,
      title: t.title,
      cost: t.cost,
      columnKey: t.columnKey,
      backlog: t.backlog,
    })),
  });
});
