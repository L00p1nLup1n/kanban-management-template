import Task from '../models/Task.js';
import Project from '../models/Project.js';
import TaskHistory from '../models/TaskHistory.js';
import {
  userHasProjectAccess,
  userIsProjectOwner,
} from '../utils/authHelpers.js';
import { getIO } from '../socket.js';

/**
 * Determine the position of a column within the project's column list.
 * Returns { isFirst, isLast, order } or null if column not found.
 */
function getColumnPosition(project, columnKey) {
  const sorted = [...project.columns].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.key === columnKey);
  if (idx === -1) return null;
  return { isFirst: idx === 0, isLast: idx === sorted.length - 1, order: sorted[idx].order };
}

/**
 * Auto-set flow timestamps based on column position.
 * - committedAt: set when a task first enters any board column
 * - startedAt:   set when a task enters a column past the first (position-aware)
 * - completedAt: set when a task enters the last column
 * Manual overrides are preserved (never overwrite existing timestamps).
 */
function applyAutoTimestamps(task, project, toColumnKey) {
  const pos = getColumnPosition(project, toColumnKey);
  if (!pos) return;

  const now = new Date();

  // committedAt: first time on the board
  if (!task.committedAt) {
    task.committedAt = now;
  }

  // startedAt: entering any column beyond the first
  if (!pos.isFirst && !task.startedAt) {
    task.startedAt = now;
  }

  // completedAt: entering the last column
  if (pos.isLast && !task.completedAt) {
    task.completedAt = now;
  }
}

/**
 * Record a column transition in the TaskHistory audit log.
 */
async function recordHistory({ taskId, projectId, fromColumn, toColumn, fromBacklog, toBacklog, movedBy }) {
  try {
    await TaskHistory.create({
      taskId,
      projectId,
      fromColumn: fromColumn || null,
      toColumn: toColumn || null,
      fromBacklog: !!fromBacklog,
      toBacklog: !!toBacklog,
      movedBy,
    });
  } catch (err) {
    // History is supplementary — don't block the main operation
    console.warn('TaskHistory record error:', err);
  }
}

export async function listTasks(req, res) {
  try {
    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // By default, exclude backlog tasks from the board listing
    const tasks = await Task.find({ projectId, backlog: { $ne: true } }).sort({
      order: 1,
    });
    return res.json({ tasks });
  } catch (err) {
    console.error('List tasks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTask(req, res) {
  try {
    const { projectId } = req.params;
    const {
      title,
      columnKey,
      order,
      description,
      color,
      labels,
      estimate,
      priority,
    } = req.body;

    if (!title || order === undefined) {
      return res.status(400).json({ error: 'title and order are required' });
    }
    if (!columnKey) {
      return res
        .status(400)
        .json({ error: 'columnKey is required for non-backlog tasks' });
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Only owner can create tasks
    if (!userIsProjectOwner(project, req.userId)) {
      return res
        .status(403)
        .json({ error: 'Only the project owner can create tasks' });
    }

    const targetColumn = project.columns.find((c) => c.key === columnKey);
    if (!targetColumn) {
      return res.status(400).json({ error: 'Column not found' });
    }

    if (targetColumn.wip !== undefined && targetColumn.wip > 0) {
      const currentCount = await Task.countDocuments({
        projectId,
        columnKey,
        backlog: { $ne: true },
      });

      if (currentCount >= targetColumn.wip) {
        return res.status(409).json({
          error: 'WIP_EXCEEDED',
          details: {
            columnKey,
            wip: targetColumn.wip,
            count: currentCount,
          },
        });
      }
    }

    const taskData = {
      projectId,
      title,
      columnKey,
      order,
      description,
      color,
      labels,
      estimate,
      priority,
      createdBy: req.userId,
    };

    // Option B: tasks created directly on board get committedAt = now
    // Also apply position-aware auto-timestamps (startedAt / completedAt)
    const now = new Date();
    taskData.committedAt = now;

    const task = await Task.create(taskData);

    // Apply position-aware auto-timestamps after creation
    applyAutoTimestamps(task, project, columnKey);
    // committedAt already set above, only save if startedAt/completedAt changed
    if (task.isModified('startedAt') || task.isModified('completedAt')) {
      await task.save();
    }

    // Record initial history: created directly on board column
    await recordHistory({
      taskId: task._id,
      projectId,
      fromColumn: null,
      toColumn: columnKey,
      fromBacklog: false,
      toBacklog: false,
      movedBy: req.userId,
    });

    // emit socket event
    try {
      const io = getIO();
      if (io) io.to(projectId).emit('task:created', { task });
    } catch (e) {
      console.warn('Socket emit error (createTask):', e);
    }

    return res.status(201).json({ task });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTask(req, res) {
  try {
    const { projectId, taskId } = req.params;
    const updates = req.body;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const isOwner = userIsProjectOwner(project, req.userId);
    const isAssignee =
      task.assigneeId && task.assigneeId.toString() === String(req.userId);

    if (isOwner && updates.columnKey && updates.columnKey !== task.columnKey) {
      const targetColumn = project.columns.find(
        (c) => c.key == updates.columnKey,
      );
      if (!targetColumn) {
        return res.status(400).json({ error: 'Target column not found' });
      }

      if (targetColumn.wip !== undefined && targetColumn.wip > 0) {
        const currentCount = await Task.countDocuments({
          projectId,
          columnKey: updates.columnKey,
          backlog: { $ne: true },
          _id: { $ne: task._id },
        });
        if (currentCount >= targetColumn.wip) {
          return res.status(409).json({
            error: 'WIP_EXCEEDED',
            details: {
              columnKey: updates.columnKey,
              wip: targetColumn.wip,
              count: currentCount,
            },
          });
        }
      }
    }
    
    const isSelfAssignClaim = 
      !task.assigneeId &&
      task.backlog === true && 
      updates.assigneeId === req.userId;
    
    const statusOnlyFields = ['startedAt', 'completedAt', 'committedAt'];
    const updateKeys = Object.keys(updates);
    const isStatusOnlyUpdate = 
      updateKeys.length > 0 &&
      updateKeys.every((key) => statusOnlyFields.includes(key));
  
    if (!isOwner) {
      // eslint-disable-next-line no-empty
      if (isSelfAssignClaim) {}
      else if (!isAssignee) {
        return res.status(403).json({ error: 'Only project owner and task assignee can update this task' });
      }
      else if (!isStatusOnlyUpdate) {
        return res.status(403).json({ error: 'Task assignee can only update timestamp (startedAt, completedAt)' });
      }
    }

    // Update allowed fields based on user role
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
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Track column change for history recording
    const previousColumn = task.columnKey || null;
    const columnChanging = updates.columnKey && updates.columnKey !== previousColumn;

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    // If column changed via direct update, apply auto-timestamps and record history
    if (columnChanging) {
      const project2 = project; // already fetched above
      applyAutoTimestamps(task, project2, updates.columnKey);
      await task.save();
      await recordHistory({
        taskId: task._id,
        projectId,
        fromColumn: previousColumn,
        toColumn: updates.columnKey,
        fromBacklog: false,
        toBacklog: false,
        movedBy: req.userId,
      });
    } else {
      await task.save();
    }
    try {
      const io = getIO();
      if (io) io.to(projectId).emit('task:updated', { task });
    } catch (e) {
      console.warn('Socket emit error (updateTask):', e);
    }
    return res.json({ task });
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBacklog(req, res) {
  try {
    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tasks = await Task.find({ projectId, backlog: true }).sort({
      createdAt: -1,
    });
    return res.json({ tasks });
  } catch (err) {
    console.error('Get backlog error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createBacklogTask(req, res) {
  try {
    const { projectId } = req.params;
    const { title, description, color, labels, estimate, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Only owner can create backlog tasks
    if (!userIsProjectOwner(project, req.userId)) {
      return res
        .status(403)
        .json({ error: 'Only the project owner can create tasks' });
    }

    const task = await Task.create({
      projectId,
      title,
      description,
      color,
      labels,
      estimate,
      priority,
      order: Date.now(), // give a stable order value for backlog
      createdBy: req.userId,
      backlog: true,
    });

    // Record initial history: created in backlog
    await recordHistory({
      taskId: task._id,
      projectId,
      fromColumn: null,
      toColumn: null,
      fromBacklog: false,
      toBacklog: true,
      movedBy: req.userId,
    });

    try {
      const io = getIO();
      if (io) io.to(projectId).emit('task:created', { task });
    } catch (e) {
      console.warn('Socket emit error (createBacklogTask):', e);
    }

    return res.status(201).json({ task });
  } catch (err) {
    console.error('Create backlog task error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function moveTask(req, res) {
  try {
    const { projectId, taskId } = req.params;
    const { toColumnKey, backlog } = req.body; // backlog: boolean

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (backlog) {
      // Move to backlog — clear flow timestamps (task is de-committed)
      const previousColumn = task.columnKey || null;
      task.backlog = true;
      task.columnKey = undefined;
      task.committedAt = undefined;
      task.startedAt = undefined;
      task.completedAt = undefined;
      await task.save();

      // Record history: board column → backlog
      await recordHistory({
        taskId: task._id,
        projectId,
        fromColumn: previousColumn,
        toColumn: null,
        fromBacklog: false,
        toBacklog: true,
        movedBy: req.userId,
      });

      try {
        const io = getIO();
        if (io) io.to(projectId).emit('task:moved', { task });
      } catch (e) {
        console.warn('Socket emit error (moveTask->backlog):', e);
      }
      return res.json({ task });
    }

    // Moving to a board column
    if (!toColumnKey) {
      return res
        .status(400)
        .json({ error: 'toColumnKey required to move to column' });
    }

    // Ensure column exists
    const col = project.columns.find((c) => c.key === toColumnKey);
    if (!col) {
      return res.status(400).json({ error: 'Column not found' });
    }

    // Count current tasks in that column (exclude backlog)
    // If task is already in the target column, exclude it from count (reorder within same column)
    const countFilter = {
      projectId,
      columnKey: toColumnKey,
      backlog: { $ne: true },
    };

    if (task.columnKey === toColumnKey) {
      countFilter._id = { $ne: task._id };
    }

    const count = await Task.countDocuments(countFilter);

    if (col.wip !== undefined && col.wip > 0 && count >= col.wip) {
      return res.status(409).json({
        error: 'WIP_EXCEEDED',
        details: { columnKey: toColumnKey, wip: col.wip, count },
      });
    }

    const previousColumn = task.columnKey || null;
    const wasBacklog = !!task.backlog;

    task.backlog = false;
    task.columnKey = toColumnKey;

    // Position-aware auto-timestamps
    applyAutoTimestamps(task, project, toColumnKey);

    await task.save();

    // Record history: column→column or backlog→column
    await recordHistory({
      taskId: task._id,
      projectId,
      fromColumn: previousColumn,
      toColumn: toColumnKey,
      fromBacklog: wasBacklog,
      toBacklog: false,
      movedBy: req.userId,
    });

    try {
      const io = getIO();
      if (io) io.to(projectId).emit('task:moved', { task });
    } catch (e) {
      console.warn('Socket emit error (moveTask):', e);
    }
    return res.json({ task });
  } catch (err) {
    console.error('Move task error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTask(req, res) {
  try {
    const { projectId, taskId } = req.params;

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only owner can delete tasks
    if (!userIsProjectOwner(project, req.userId)) {
      return res
        .status(403)
        .json({ error: 'Only the project owner can delete tasks' });
    }

    await Task.deleteOne({ _id: taskId });
    await Task.findByIdAndDelete(taskId);
    try {
      const io = getIO();
      if (io) io.to(projectId).emit('task:deleted', { taskId });
    } catch (e) {
      console.warn('Socket emit error (deleteTask):', e);
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete task error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function reorderTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { tasks } = req.body; // Array of { id, order, columnKey? }

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks array required' });
    }

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Bulk update tasks
    // Validate WIP limits before applying bulk updates.
    // Build a map of current counts per column (excluding backlog)
    const currentCounts = {};
    const boardTasks = await Task.find({ projectId, backlog: { $ne: true } });
    boardTasks.forEach((t) => {
      const key = t.columnKey || 'backlog';
      currentCounts[key] = (currentCounts[key] || 0) + 1;
    });

    // Apply proposals to compute resulting counts
    const resultingCounts = { ...currentCounts };
    tasks.forEach(({ id, columnKey }) => {
      // find original task's column
      const original = boardTasks.find((t) => String(t._id) === String(id));
      const from = original ? original.columnKey || 'backlog' : 'backlog';
      const to = columnKey || 'backlog';
      if (from === to) return;
      resultingCounts[from] = Math.max(0, (resultingCounts[from] || 0) - 1);
      resultingCounts[to] = (resultingCounts[to] || 0) + 1;
    });

    // Check against project column WIP
    const wipViolations = [];
    // Build a quick map for column wip (including backlog if needed)
    const colWip = {};
    project.columns.forEach((c) => {
      colWip[c.key] = c.wip;
    });

    Object.keys(resultingCounts).forEach((colKey) => {
      const count = resultingCounts[colKey] || 0;
      const wip = colWip[colKey];
      if (wip !== undefined && wip > 0 && count > wip) {
        wipViolations.push({ columnKey: colKey, wip, count });
      }
    });

    if (wipViolations.length > 0) {
      return res.status(409).json({
        error: 'WIP_EXCEEDED',
        details: { violations: wipViolations },
      });
    }

    const bulkOps = tasks.map(({ id, order, columnKey }) => ({
      updateOne: {
        filter: { _id: id, projectId },
        update: { order, ...(columnKey && { columnKey }) },
      },
    }));

    await Task.bulkWrite(bulkOps);
    try {
      const io = getIO();
      if (io) io.to(projectId).emit('tasks:reordered', { tasks });
    } catch (e) {
      console.warn('Socket emit error (reorderTasks):', e);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Reorder tasks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Migration endpoint: import tasks from localStorage
export async function importLocalTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { tasks, importId } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks array required' });
    }

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Optional: check if import already done (dedupe by importId)
    // For MVP, we'll just create tasks

    const createdTasks = [];
    for (const [index, taskData] of tasks.entries()) {
      const task = await Task.create({
        projectId,
        title: taskData.title || 'Untitled',
        columnKey: taskData.column || taskData.columnKey || 'to-do',
        color: taskData.color,
        order: (index + 1) * 1000,
        createdBy: req.userId,
      });
      createdTasks.push(task);
    }

    return res
      .status(201)
      .json({ tasks: createdTasks, imported: createdTasks.length });
  } catch (err) {
    console.error('Import tasks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
