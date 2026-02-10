/* eslint-disable no-case-declarations */
import Sprint from '../models/Sprint.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { getIO } from '../socket.js';
import {
  userHasProjectAccess,
  userIsProjectOwner,
} from '../utils/authHelpers.js';

export async function listSprints(req, res) {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const sprints = await Sprint.find({ projectId }).sort({ startDate: -1 });
    return res.json({ sprints });
  } catch (err) {
    console.error('List sprint error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSprint(req, res) {
  try {
    const { projectId } = req.params;
    const { name, goal, startDate, endDate, capacity } = req.body;

    if (!name || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'name, start date and end date are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userIsProjectOwner(project, req.userId)) {
      return res
        .status(403)
        .json({ error: 'Only project owner can create sprints' });
    }

    const sprint = await Sprint.create({
      projectId,
      name,
      goal,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      capacity: capacity || 0,
      status: 'planning',
    });

    const io = getIO();
    if (io) io.to(projectId).emit('sprint:created', { sprint });

    return res.status(201).json({ sprint });
  } catch (err) {
    console.error('Error creating sprint:', err);
    if (err.message.includes('Start date cannot be after end date')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getActiveSprint(req, res) {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sprint = await Sprint.findOne({ projectId, status: 'active' });
    return res.json({ sprint: sprint || null });
  } catch (err) {
    console.error('Get active sprint error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSprint(req, res) {
  try {
    const { projectId, sprintId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sprint = await Sprint.findOne({ _id: sprintId, projectId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    return res.json({ sprint });
  } catch (err) {
    console.error('Get sprint error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSprint(req, res) {
  try {
    const { projectId, sprintId } = req.params;
    const { name, goal, startDate, endDate, capacity, status, retrospective } =
      req.body;

    // Basic validation
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can update sprints
    if (!userIsProjectOwner(project, req.userId)) {
      return res.status(403).json({
        error: 'Only the project owner can update sprints',
      });
    }

    // Verify sprint exists and belongs to project
    const sprint = await Sprint.findOne({ _id: sprintId, projectId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const currentStatus = sprint.status;

    // Define allowed fields per status
    const allowedFieldsByStatus = {
      planning: [
        'name',
        'goal',
        'startDate',
        'endDate',
        'capacity',
        'status',
        'retrospective',
      ],
      active: [
        'name',
        'goal',
        'endDate',
        'capacity',
        'status',
        'retrospective',
      ],
      completed: ['name', 'goal', 'retrospective', 'status'],
      archived: [],
    };

    const allowedFields = allowedFieldsByStatus[currentStatus];

    if (currentStatus === 'archived') {
      return res.status(400).json({
        error: 'Cannot update archived sprint',
      });
    }

    // Check if any disallowed fields are being updated
    const updateKeys = Object.keys(req.body);
    const disallowedFields = updateKeys.filter(
      (key) => !allowedFields.includes(key),
    );

    if (disallowedFields.length > 0) {
      return res.status(400).json({
        error: `Cannot update fields [${disallowedFields.join(
          ', ',
        )}] when sprint status is '${currentStatus}'`,
        allowedFields,
      });
    }

    // Validate status transitions
    if (status && status !== currentStatus) {
      const validTransitions = {
        planning: ['active'],
        active: ['completed'],
        completed: ['archived'],
        archived: [],
      };

      if (!validTransitions[currentStatus].includes(status)) {
        return res.status(400).json({
          error: `Invalid status transition from '${currentStatus}' to '${status}'`,
          validTransitions: validTransitions[currentStatus],
        });
      }

      // Additional validation for specific transitions
      switch (status) {
        case 'active':
          // Check if another sprint is already active
          const existingActiveSprint = await Sprint.findOne({
            projectId,
            status: 'active',
            _id: { $ne: sprintId },
          });

          if (existingActiveSprint) {
            return res.status(409).json({
              error: 'Only one active sprint allowed per project',
              activeSprint: existingActiveSprint,
            });
          }
          break;

        case 'completed':
          // When completing a sprint, we no longer track story points
          break;

        case 'archived':
          // Ensure retrospective is filled out
          if (
            !sprint.retrospective ||
            !sprint.retrospective.whatWentWell?.length ||
            !sprint.retrospective.whatCouldImprove?.length
          ) {
            return res.status(400).json({
              error: 'Retrospective required before archiving sprint',
              hint: 'Add retrospective data with whatWentWell, whatCouldImprove, and actionItems',
            });
          }
          break;
      }
    }

    // Apply updates
    if (name !== undefined) sprint.name = name;
    if (goal !== undefined) sprint.goal = goal;
    if (capacity !== undefined) {
      if (capacity < 0) {
        return res.status(400).json({ error: 'Capacity cannot be negative' });
      }
      sprint.capacity = capacity;
    }

    // Date updates (only if allowed by status)
    if (startDate !== undefined && allowedFields.includes('startDate')) {
      sprint.startDate = new Date(startDate);
    }
    if (endDate !== undefined && allowedFields.includes('endDate')) {
      sprint.endDate = new Date(endDate);
    }

    // Status update
    if (status !== undefined) {
      sprint.status = status;
    }

    // Retrospective update
    if (retrospective !== undefined) {
      sprint.retrospective = sprint.retrospective || {};

      if (retrospective.whatWentWell !== undefined) {
        sprint.retrospective.whatWentWell = retrospective.whatWentWell;
      }
      if (retrospective.whatCouldImprove !== undefined) {
        sprint.retrospective.whatCouldImprove = retrospective.whatCouldImprove;
      }
      if (retrospective.actionItems !== undefined) {
        sprint.retrospective.actionItems = retrospective.actionItems;
      }
    }

    await sprint.save();

    // Emit real-time update to all project members
    try {
      const io = getIO();
      if (io) {
        io.to(projectId).emit('sprint:updated', {
          sprint,
          updatedFields: Object.keys(req.body),
          previousStatus: currentStatus,
        });

        // Specific event for status transitions
        if (status && status !== currentStatus) {
          io.to(projectId).emit('sprint:status-changed', {
            sprintId,
            from: currentStatus,
            to: status,
            sprint,
          });
        }
      }
    } catch (e) {
      console.warn('Socket emit error (updateSprint):', e);
    }

    return res.json({
      sprint,
      message:
        status && status !== currentStatus
          ? `Sprint transitioned from '${currentStatus}' to '${status}'`
          : 'Sprint updated successfully',
    });
  } catch (err) {
    console.error('Update sprint error:', err);

    // Handle specific Mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.message,
      });
    }

    // Handle date validation from pre-save hook
    if (err.message.includes('Start date cannot be after end date')) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSprint(req, res) {
  try {
    const { projectId, sprintId } = req.params;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can delete sprints
    if (!userIsProjectOwner(project, req.userId)) {
      return res.status(403).json({
        error: 'Only the project owner can delete sprints',
      });
    }

    // Verify sprint exists and belongs to project
    const sprint = await Sprint.findOne({ _id: sprintId, projectId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Find all tasks associated with this sprint
    const sprintTasks = await Task.find({ sprintId: sprint._id });

    if (sprintTasks.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete sprint with associated tasks',
        taskCount: sprintTasks.length,
        hint: 'Move tasks to another sprint or backlog first',
      });
    }

    await Sprint.findByIdAndDelete(sprintId);

    // Emit socket event
    try {
      const io = getIO();
      if (io) {
        io.to(projectId).emit('sprint:deleted', { sprintId });
      }
    } catch (e) {
      console.warn('Socket emit error (deleteSprint):', e);
    }

    return res.status(204).send();
  } catch (err) {
    console.error('Delete sprint error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSprintMetrics(req, res) {
  try {
    const { projectId, sprintId } = req.params;

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sprint = await Sprint.findOne({ _id: sprintId, projectId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Get all tasks for this sprint
    const tasks = await Task.find({ sprintId: sprint._id });

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completedAt).length;
    const inProgressTasks = tasks.filter(
      (t) => t.startedAt && !t.completedAt,
    ).length;
    const notStartedTasks = tasks.filter((t) => !t.startedAt).length;

    // Calculate cycle time (average time from startedAt to completedAt)
    const completedTasksWithTimes = tasks.filter(
      (t) => t.startedAt && t.completedAt,
    );
    const avgCycleTimeMs =
      completedTasksWithTimes.length > 0
        ? completedTasksWithTimes.reduce((sum, t) => {
            return sum + (new Date(t.completedAt) - new Date(t.startedAt));
          }, 0) / completedTasksWithTimes.length
        : 0;
    const avgCycleTimeHours = avgCycleTimeMs / (1000 * 60 * 60);

    // Calculate burndown data
    const burndownData = await calculateBurndown(sprint, tasks);

    return res.json({
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        completionRate:
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10
            : 0,
        capacity: sprint.capacity,
        avgCycleTimeHours: Math.round(avgCycleTimeHours * 10) / 10,
        burndown: burndownData,
      },
    });
  } catch (err) {
    console.error('Get sprint metrics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function calculateBurndown(sprint, tasks) {
  const burndown = [];
  const startDate = new Date(sprint.startDate);
  const endDate = sprint.endDate ? new Date(sprint.endDate) : new Date();

  // Total tasks at sprint start
  const totalTasks = tasks.length;

  // Iterate through each day of the sprint
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Calculate remaining tasks at end of this day
    const completedByThisDate = tasks.filter((t) => {
      return t.completedAt && new Date(t.completedAt) <= currentDate;
    });

    const completedTasks = completedByThisDate.length;
    const remainingTasks = totalTasks - completedTasks;

    burndown.push({
      date: new Date(currentDate).toISOString().split('T')[0],
      remainingTasks,
      completedTasks,
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return burndown;
}
