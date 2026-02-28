import Task from '../models/Task.js';
import TaskHistory from '../models/TaskHistory.js';

export async function findBoardTasks(projectId) {
  return await Task.find({ projectId, backlog: { $ne: true } }).sort({
    order: 1,
  });
}

export async function findBacklogTasks(projectId) {
  return await Task.find({ projectId, backlog: true }).sort({
    createdAt: -1,
  });
}

export async function findTaskById(taskId, projectId) {
  return await Task.findOne({ _id: taskId, projectId });
}

export async function countTasksInColumn(
  projectId,
  columnKey,
  excludeTaskId = null,
) {
  const filter = { projectId, columnKey, backlog: { $ne: true } };
  if (excludeTaskId) filter._id = { $ne: excludeTaskId };
  return await Task.countDocuments(filter);
}

export async function insertTask(taskData) {
  return await Task.create(taskData);
}

export async function saveTask(task) {
  return await task.save();
}

export async function deleteTaskById(taskId) {
  return await Task.findByIdAndDelete(taskId);
}

export async function findAllBoardTasks(projectId) {
  return await Task.find({ projectId, backlog: { $ne: true } });
}

export async function bulkWriteTasks(operations) {
  return await Task.bulkWrite(operations);
}

export async function bulkInsertTasks(tasksData) {
  const created = [];
  for (const data of tasksData) {
    const task = await Task.create(data);
    created.push(task);
  }
  return created;
}

export async function insertTaskHistory(historyData) {
  return await TaskHistory.create({
    taskId: historyData.taskId,
    projectId: historyData.projectId,
    fromColumn: historyData.fromColumn || null,
    toColumn: historyData.toColumn || null,
    fromBacklog: !!historyData.fromBacklog,
    toBacklog: !!historyData.toBacklog,
    movedBy: historyData.movedBy,
  });
}
