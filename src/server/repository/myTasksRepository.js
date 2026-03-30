import Task from '../models/Task.js';
import Project from '../models/Project.js';

export async function findProjectsForUser(userId) {
  return await Project.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  }).select('_id name columns');
}

export async function findTasksAssignedToUser(userId, projectIds) {
  return await Task.find({
    assigneeId: userId,
    projectId: { $in: projectIds },
    completedAt: null,
  }).sort({ priority: -1, updatedAt: -1 });
}
