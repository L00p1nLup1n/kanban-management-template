import { asyncHandler } from '../helpers/asyncWrapper.js';
import { TaskError } from '../errors/error.js';
import { findProjectById } from '../service/projectService.js';
import {
  userHasProjectAccess,
  userIsProjectOwner,
} from '../utils/authUtils.js';
import {
  listBoardTasks,
  createBoardTask,
  updateTask as updateTaskService,
  listBacklogTasks,
  createBacklogTask as createBacklogTaskService,
  moveTask as moveTaskService,
  deleteTask as deleteTaskService,
  reorderTasks as reorderTasksService,
  importLocalTasks as importLocalTasksService,
  TaskOutcome,
} from '../service/taskService.js';
import { getIO } from '../socket.js';

function emitSocket(projectId, event, data) {
  try {
    const io = getIO();
    if (io) io.to(projectId).emit(event, data);
  } catch (e) {
    console.warn(`Socket emit error (${event}):`, e);
  }
}

async function resolveProject(projectId, userId) {
  const project = await findProjectById(projectId);
  if (!project) throw new TaskError(404, 'Project not found');
  if (!userHasProjectAccess(project, userId))
    throw new TaskError(403, 'Forbidden');
  return project;
}

export const listTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await resolveProject(projectId, req.userId);

  const tasks = await listBoardTasks(projectId);
  return res.json({ tasks });
});

export const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await resolveProject(projectId, req.userId);
  const result = await createBoardTask(project, req.userId, req.body);

  if (result.outcome === TaskOutcome.VALIDATION_ERROR)
    throw new TaskError(400, result.message);
  if (result.outcome === TaskOutcome.NOT_OWNER)
    throw new TaskError(403, 'Only the project owner can create tasks');
  if (result.outcome === TaskOutcome.COLUMN_NOT_FOUND)
    throw new TaskError(400, 'Column not found');
  if (result.outcome === TaskOutcome.WIP_EXCEEDED)
    throw new TaskError(409, 'WIP_EXCEEDED');

  emitSocket(projectId, 'task:created', { task: result.task });
  return res.status(201).json({ task: result.task });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const project = await resolveProject(projectId, req.userId);
  const result = await updateTaskService(project, taskId, req.userId, req.body);

  if (result.outcome === TaskOutcome.TASK_NOT_FOUND)
    throw new TaskError(404, 'Task not found');
  if (result.outcome === TaskOutcome.COLUMN_NOT_FOUND)
    throw new TaskError(400, 'Target column not found');
  if (result.outcome === TaskOutcome.WIP_EXCEEDED)
    throw new TaskError(409, 'WIP_EXCEEDED');
  if (result.outcome === TaskOutcome.NOT_AUTHORIZED)
    throw new TaskError(403, result.message);

  emitSocket(projectId, 'task:updated', { task: result.task });
  return res.json({ task: result.task });
});

export const getBacklog = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await resolveProject(projectId, req.userId);

  const tasks = await listBacklogTasks(projectId);
  return res.json({ tasks });
});

export const createBacklogTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await resolveProject(projectId, req.userId);
  const result = await createBacklogTaskService(project, req.userId, req.body);

  if (result.outcome === TaskOutcome.VALIDATION_ERROR)
    throw new TaskError(400, result.message);
  if (result.outcome === TaskOutcome.NOT_OWNER)
    throw new TaskError(403, 'Only the project owner can create tasks');

  emitSocket(projectId, 'task:created', { task: result.task });
  return res.status(201).json({ task: result.task });
});

export const moveTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const project = await resolveProject(projectId, req.userId);
  const result = await moveTaskService(project, taskId, req.userId, req.body);

  if (result.outcome === TaskOutcome.TASK_NOT_FOUND)
    throw new TaskError(404, 'Task not found');
  if (result.outcome === TaskOutcome.VALIDATION_ERROR)
    throw new TaskError(400, result.message);
  if (result.outcome === TaskOutcome.COLUMN_NOT_FOUND)
    throw new TaskError(400, 'Column not found');
  if (result.outcome === TaskOutcome.WIP_EXCEEDED)
    throw new TaskError(409, 'WIP_EXCEEDED');

  emitSocket(projectId, 'task:moved', { task: result.task });
  return res.json({ task: result.task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const project = await resolveProject(projectId, req.userId);
  const result = await deleteTaskService(project, taskId, req.userId);

  if (result.outcome === TaskOutcome.TASK_NOT_FOUND)
    throw new TaskError(404, 'Task not found');
  if (result.outcome === TaskOutcome.NOT_OWNER)
    throw new TaskError(403, 'Only the project owner can delete tasks');

  emitSocket(projectId, 'task:deleted', { taskId });
  return res.status(204).send();
});

export const reorderTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await resolveProject(projectId, req.userId);

  if (!userIsProjectOwner(project, req.userId))
    throw new TaskError(403, 'Forbidden');

  const { tasks } = req.body;
  const result = await reorderTasksService(project, tasks);

  if (result.outcome === TaskOutcome.VALIDATION_ERROR)
    throw new TaskError(400, result.message);
  if (result.outcome === TaskOutcome.WIP_EXCEEDED)
    throw new TaskError(409, 'WIP_EXCEEDED');

  emitSocket(projectId, 'tasks:reordered', { tasks });
  return res.json({ success: true });
});

export const importLocalTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await resolveProject(projectId, req.userId);

  if (!userIsProjectOwner(project, req.userId))
    throw new TaskError(403, 'Forbidden');

  const { tasks } = req.body;
  const result = await importLocalTasksService(project, req.userId, tasks);

  if (result.outcome === TaskOutcome.VALIDATION_ERROR)
    throw new TaskError(400, result.message);

  return res.status(201).json({ tasks: result.tasks, imported: result.count });
});
