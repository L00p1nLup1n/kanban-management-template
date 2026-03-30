import Task from '../models/Task.js';

export async function findTasksForProjects(projectIds) {
  return await Task.find({ projectId: { $in: projectIds } });
}

export async function findUpcomingDeadlines(projectIds, daysAhead) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  return await Task.find({
    projectId: { $in: projectIds },
    dueDate: { $gte: now, $lte: future },
    completedAt: null,
  }).populate('assigneeId', 'name email');
}
