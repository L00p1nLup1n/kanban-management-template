import {
  findProjectsForUser,
  findTasksAssignedToUser,
} from '../repository/myTasksRepository.js';

export async function getMyTasks(userId) {
  const projects = await findProjectsForUser(userId);
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p._id);
  const tasks = await findTasksAssignedToUser(userId, projectIds);

  const projectMap = new Map(projects.map((p) => [p._id.toString(), p]));

  // Group tasks by project
  const grouped = new Map();
  for (const task of tasks) {
    const pid = task.projectId.toString();
    if (!grouped.has(pid)) {
      const project = projectMap.get(pid);
      grouped.set(pid, {
        projectId: pid,
        projectName: project?.name || 'Unknown',
        columns: project?.columns || [],
        tasks: [],
      });
    }
    grouped.get(pid).tasks.push(task);
  }

  return Array.from(grouped.values());
}
