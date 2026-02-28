import {
  findBoardTasks,
  findBacklogTasks,
  findTaskById,
  countTasksInColumn,
  insertTask,
  saveTask,
  deleteTaskById,
  findAllBoardTasks,
  bulkWriteTasks,
  bulkInsertTasks,
  insertTaskHistory,
} from '../repository/taskRepository.js';
import { userIsProjectOwner } from '../utils/authUtils.js';
import { applyAutoTimestamps } from '../utils/taskUtils.js';

export const TaskOutcome = Object.freeze({
  OK: 'ok',
  CREATED: 'created',
  UPDATED: 'updated',
  MOVED: 'moved',
  DELETED: 'deleted',
  REORDERED: 'reordered',
  IMPORTED: 'imported',
  TASK_NOT_FOUND: 'task_not_found',
  NOT_OWNER: 'not_owner',
  NOT_AUTHORIZED: 'not_authorized',
  VALIDATION_ERROR: 'validation_error',
  COLUMN_NOT_FOUND: 'column_not_found',
  WIP_EXCEEDED: 'wip_exceeded',
});

/**
 * Record a column transition. Failures are logged but non-fatal.
 */
async function recordHistory(historyData) {
  try {
    await insertTaskHistory(historyData);
  } catch (err) {
    console.warn('TaskHistory record error:', err);
  }
}

export async function listBoardTasks(projectId) {
  return await findBoardTasks(projectId);
}

export async function listBacklogTasks(projectId) {
  return await findBacklogTasks(projectId);
}

export async function createBoardTask(project, userId, taskData) {
  const {
    title,
    columnKey,
    order,
    description,
    color,
    labels,
    estimate,
    priority,
  } = taskData;

  if (!title || order === undefined) {
    return {
      outcome: TaskOutcome.VALIDATION_ERROR,
      message: 'title and order are required',
    };
  }
  if (!columnKey) {
    return {
      outcome: TaskOutcome.VALIDATION_ERROR,
      message: 'columnKey is required for non-backlog tasks',
    };
  }

  if (!userIsProjectOwner(project, userId)) {
    return { outcome: TaskOutcome.NOT_OWNER };
  }

  const targetColumn = project.columns.find((c) => c.key === columnKey);
  if (!targetColumn) {
    return { outcome: TaskOutcome.COLUMN_NOT_FOUND };
  }

  if (targetColumn.wip !== undefined && targetColumn.wip > 0) {
    const currentCount = await countTasksInColumn(project._id, columnKey);
    if (currentCount >= targetColumn.wip) {
      return {
        outcome: TaskOutcome.WIP_EXCEEDED,
        details: { columnKey, wip: targetColumn.wip, count: currentCount },
      };
    }
  }

  const now = new Date();
  const task = await insertTask({
    projectId: project._id,
    title,
    columnKey,
    order,
    description,
    color,
    labels,
    estimate,
    priority,
    createdBy: userId,
    committedAt: now,
  });

  applyAutoTimestamps(task, project, columnKey);
  if (task.isModified('startedAt') || task.isModified('completedAt')) {
    await saveTask(task);
  }

  await recordHistory({
    taskId: task._id,
    projectId: project._id,
    fromColumn: null,
    toColumn: columnKey,
    fromBacklog: false,
    toBacklog: false,
    movedBy: userId,
  });

  return { outcome: TaskOutcome.CREATED, task };
}

export async function updateTask(project, taskId, userId, updates) {
  const projectId = project._id;
  const task = await findTaskById(taskId, projectId);
  if (!task) return { outcome: TaskOutcome.TASK_NOT_FOUND };

  const isOwner = userIsProjectOwner(project, userId);
  const isAssignee =
    task.assigneeId && task.assigneeId.toString() === String(userId);

  // WIP check for column changes (owner only)
  if (isOwner && updates.columnKey && updates.columnKey !== task.columnKey) {
    const targetColumn = project.columns.find(
      (c) => c.key === updates.columnKey,
    );
    if (!targetColumn) return { outcome: TaskOutcome.COLUMN_NOT_FOUND };

    if (targetColumn.wip !== undefined && targetColumn.wip > 0) {
      const currentCount = await countTasksInColumn(
        projectId,
        updates.columnKey,
        task._id,
      );
      if (currentCount >= targetColumn.wip) {
        return {
          outcome: TaskOutcome.WIP_EXCEEDED,
          details: {
            columnKey: updates.columnKey,
            wip: targetColumn.wip,
            count: currentCount,
          },
        };
      }
    }
  }

  const statusOnlyFields = ['startedAt', 'completedAt', 'committedAt'];
  const updateKeys = Object.keys(updates);
  const isStatusOnlyUpdate =
    updateKeys.length > 0 &&
    updateKeys.every((key) => statusOnlyFields.includes(key));

  if (!isOwner) {
    if (!isAssignee) {
      return {
        outcome: TaskOutcome.NOT_AUTHORIZED,
        message: 'Only the project owner or task assignee can update this task',
      };
    }
    if (!isStatusOnlyUpdate) {
      return {
        outcome: TaskOutcome.NOT_AUTHORIZED,
        message:
          'Task assignees can only update status timestamps (startedAt, completedAt)',
      };
    }
  }

  let allowedFields;
  if (isOwner) {
    allowedFields = [
      'title',
      'description',
      'color',
      'columnKey',
      'order',
      'assigneeId',
      'labels',
      'estimate',
      'priority',
      'backlog',
      'dueDate',
      'committedAt',
      'startedAt',
      'completedAt',
    ];
  } else if (isAssignee) {
    allowedFields = ['startedAt', 'completedAt'];
  } else {
    return {
      outcome: TaskOutcome.NOT_AUTHORIZED,
      message: 'Forbidden',
    };
  }

  const previousColumn = task.columnKey || null;
  const columnChanging =
    updates.columnKey && updates.columnKey !== previousColumn;

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      task[field] = updates[field];
    }
  });

  if (columnChanging) {
    applyAutoTimestamps(task, project, updates.columnKey);
    await saveTask(task);
    await recordHistory({
      taskId: task._id,
      projectId,
      fromColumn: previousColumn,
      toColumn: updates.columnKey,
      fromBacklog: false,
      toBacklog: false,
      movedBy: userId,
    });
  } else {
    await saveTask(task);
  }

  return { outcome: TaskOutcome.UPDATED, task };
}

export async function createBacklogTask(project, userId, taskData) {
  const { title, description, color, labels, estimate, priority } = taskData;

  if (!title) {
    return {
      outcome: TaskOutcome.VALIDATION_ERROR,
      message: 'title is required',
    };
  }

  if (!userIsProjectOwner(project, userId)) {
    return { outcome: TaskOutcome.NOT_OWNER };
  }

  const projectId = project._id;
  const task = await insertTask({
    projectId,
    title,
    description,
    color,
    labels,
    estimate,
    priority,
    order: Date.now(),
    createdBy: userId,
    backlog: true,
  });

  await recordHistory({
    taskId: task._id,
    projectId,
    fromColumn: null,
    toColumn: null,
    fromBacklog: false,
    toBacklog: true,
    movedBy: userId,
  });

  return { outcome: TaskOutcome.CREATED, task };
}

export async function moveTask(project, taskId, userId, moveData) {
  const { toColumnKey, backlog } = moveData;
  const projectId = project._id;

  const task = await findTaskById(taskId, projectId);
  if (!task) return { outcome: TaskOutcome.TASK_NOT_FOUND };

  if (backlog) {
    const previousColumn = task.columnKey || null;
    task.backlog = true;
    task.columnKey = undefined;
    task.committedAt = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;
    await saveTask(task);

    await recordHistory({
      taskId: task._id,
      projectId,
      fromColumn: previousColumn,
      toColumn: null,
      fromBacklog: false,
      toBacklog: true,
      movedBy: userId,
    });

    return { outcome: TaskOutcome.MOVED, task };
  }

  if (!toColumnKey) {
    return {
      outcome: TaskOutcome.VALIDATION_ERROR,
      message: 'toColumnKey required to move to column',
    };
  }

  const col = project.columns.find((c) => c.key === toColumnKey);
  if (!col) return { outcome: TaskOutcome.COLUMN_NOT_FOUND };

  const excludeId = task.columnKey === toColumnKey ? task._id : null;
  const count = await countTasksInColumn(projectId, toColumnKey, excludeId);

  if (col.wip !== undefined && col.wip > 0 && count >= col.wip) {
    return {
      outcome: TaskOutcome.WIP_EXCEEDED,
      details: { columnKey: toColumnKey, wip: col.wip, count },
    };
  }

  const previousColumn = task.columnKey || null;
  const wasBacklog = !!task.backlog;

  task.backlog = false;
  task.columnKey = toColumnKey;
  applyAutoTimestamps(task, project, toColumnKey);
  await saveTask(task);

  await recordHistory({
    taskId: task._id,
    projectId,
    fromColumn: previousColumn,
    toColumn: toColumnKey,
    fromBacklog: wasBacklog,
    toBacklog: false,
    movedBy: userId,
  });

  return { outcome: TaskOutcome.MOVED, task };
}

export async function deleteTask(project, taskId, userId) {
  const projectId = project._id;

  const task = await findTaskById(taskId, projectId);
  if (!task) return { outcome: TaskOutcome.TASK_NOT_FOUND };

  if (!userIsProjectOwner(project, userId)) {
    return { outcome: TaskOutcome.NOT_OWNER };
  }

  await deleteTaskById(taskId);
  return { outcome: TaskOutcome.DELETED, taskId };
}

export async function reorderTasks(project, tasksArray) {
  if (!Array.isArray(tasksArray)) {
    return {
      outcome: TaskOutcome.VALIDATION_ERROR,
      message: 'tasks array required',
    };
  }

  const projectId = project._id;
  const boardTasks = await findAllBoardTasks(projectId);
  const currentCounts = {};
  boardTasks.forEach((t) => {
    const key = t.columnKey || 'backlog';
    currentCounts[key] = (currentCounts[key] || 0) + 1;
  });

  const resultingCounts = { ...currentCounts };
  tasksArray.forEach(({ id, columnKey }) => {
    const original = boardTasks.find((t) => String(t._id) === String(id));
    const from = original ? original.columnKey || 'backlog' : 'backlog';
    const to = columnKey || 'backlog';
    if (from === to) return;
    resultingCounts[from] = Math.max(0, (resultingCounts[from] || 0) - 1);
    resultingCounts[to] = (resultingCounts[to] || 0) + 1;
  });

  const colWip = {};
  project.columns.forEach((c) => {
    colWip[c.key] = c.wip;
  });

  const wipViolations = [];
  Object.keys(resultingCounts).forEach((colKey) => {
    const count = resultingCounts[colKey] || 0;
    const wip = colWip[colKey];
    if (wip !== undefined && wip > 0 && count > wip) {
      wipViolations.push({ columnKey: colKey, wip, count });
    }
  });

  if (wipViolations.length > 0) {
    return {
      outcome: TaskOutcome.WIP_EXCEEDED,
      details: { violations: wipViolations },
    };
  }

  const bulkOps = tasksArray.map(({ id, order, columnKey }) => ({
    updateOne: {
      filter: { _id: id, projectId },
      update: { order, ...(columnKey && { columnKey }) },
    },
  }));

  await bulkWriteTasks(bulkOps);
  return { outcome: TaskOutcome.REORDERED, tasks: tasksArray };
}

export async function importLocalTasks(project, userId, tasksArray) {
  if (!Array.isArray(tasksArray)) {
    return {
      outcome: TaskOutcome.VALIDATION_ERROR,
      message: 'tasks array required',
    };
  }

  const projectId = project._id;
  const tasksData = tasksArray.map((taskData, index) => ({
    projectId,
    title: taskData.title || 'Untitled',
    columnKey: taskData.column || taskData.columnKey || 'to-do',
    color: taskData.color,
    order: (index + 1) * 1000,
    createdBy: userId,
  }));

  const createdTasks = await bulkInsertTasks(tasksData);
  return {
    outcome: TaskOutcome.IMPORTED,
    tasks: createdTasks,
    count: createdTasks.length,
  };
}
