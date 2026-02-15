import Task from '../models/Task.js';
import TaskHistory from '../models/TaskHistory.js';
import Project from '../models/Project.js';
import { userHasProjectAccess } from '../utils/authUtils.js';

/**
 * GET /api/v1/projects/:projectId/metrics
 *
 * Returns flow metrics for the project:
 *   - cycleTime:     avg/median/p85 hours from startedAt → completedAt
 *   - leadTime:      avg/median/p85 hours from createdAt → completedAt (system)
 *   - boardLeadTime: avg/median/p85 hours from committedAt → completedAt
 *   - throughput:     tasks completed per day (last 30 days)
 *   - wipAge:         currently in-progress tasks with age in hours
 *   - currentWip:     count of tasks per column (live board state)
 *   - cfd:            cumulative flow data over time (from TaskHistory)
 *
 * Query params:
 *   - days: lookback window in days (default 30)
 */
export async function getProjectMetrics(req, res) {
  try {
    const { projectId } = req.params;
    const days = parseInt(req.query.days, 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!userHasProjectAccess(project, req.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch tasks for this project (exclude deleted)
    const allTasks = await Task.find({ projectId });
    const boardTasks = allTasks.filter((t) => !t.backlog);
    const now = new Date();

    // ── Cycle Time (startedAt → completedAt) ────────────────────────
    const completedTasks = allTasks.filter(
      (t) => t.completedAt && t.startedAt && new Date(t.completedAt) >= since,
    );
    const cycleTimes = completedTasks.map(
      (t) =>
        (new Date(t.completedAt) - new Date(t.startedAt)) / (1000 * 60 * 60),
    );

    // ── Lead Time (createdAt → completedAt) ─────────────────────────
    const leadTimes = completedTasks.map(
      (t) =>
        (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60),
    );

    // ── Board Lead Time (committedAt → completedAt) ─────────────────
    const boardLeadTimes = completedTasks
      .filter((t) => t.committedAt)
      .map(
        (t) =>
          (new Date(t.completedAt) - new Date(t.committedAt)) /
          (1000 * 60 * 60),
      );

    // ── Throughput (tasks completed per day, last N days) ───────────
    const throughputMap = {};
    for (let d = 0; d < days; d++) {
      const date = new Date(since);
      date.setDate(since.getDate() + d);
      throughputMap[date.toISOString().slice(0, 10)] = 0;
    }
    completedTasks.forEach((t) => {
      const key = new Date(t.completedAt).toISOString().slice(0, 10);
      if (throughputMap[key] !== undefined) {
        throughputMap[key]++;
      }
    });
    const throughput = Object.entries(throughputMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // ── WIP Age (in-progress tasks: have startedAt but no completedAt) ──
    const wipTasks = boardTasks.filter((t) => t.startedAt && !t.completedAt);
    const wipAge = wipTasks.map((t) => ({
      taskId: t._id,
      title: t.title,
      column: t.columnKey,
      ageHours:
        Math.round(((now - new Date(t.startedAt)) / (1000 * 60 * 60)) * 10) /
        10,
      priority: t.priority,
    }));

    // ── Current WIP per column ──────────────────────────────────────
    const currentWip = {};
    const sortedColumns = [...project.columns].sort(
      (a, b) => a.order - b.order,
    );
    sortedColumns.forEach((c) => {
      currentWip[c.key] = { title: c.title, count: 0, wip: c.wip };
    });
    boardTasks.forEach((t) => {
      if (t.columnKey && currentWip[t.columnKey]) {
        currentWip[t.columnKey].count++;
      }
    });

    // ── Cumulative Flow Diagram (from TaskHistory) ──────────────────
    const cfd = await buildCFD(projectId, project, since, days);

    // ── Assemble response ───────────────────────────────────────────
    return res.json({
      metrics: {
        cycleTime: computeStats(cycleTimes),
        leadTime: computeStats(leadTimes),
        boardLeadTime: computeStats(boardLeadTimes),
        throughput,
        wipAge,
        currentWip,
        cfd,
        summary: {
          totalTasks: allTasks.length,
          boardTasks: boardTasks.length,
          backlogTasks: allTasks.filter((t) => t.backlog).length,
          completedInPeriod: completedTasks.length,
          inProgress: wipTasks.length,
        },
      },
    });
  } catch (err) {
    console.error('Get project metrics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Compute avg, median, p85, min, max from an array of numbers.
 */
function computeStats(values) {
  if (values.length === 0) {
    return { avg: 0, median: 0, p85: 0, min: 0, max: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg =
    Math.round((sorted.reduce((s, v) => s + v, 0) / sorted.length) * 10) / 10;
  const median = Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
  const p85 = Math.round(sorted[Math.floor(sorted.length * 0.85)] * 10) / 10;
  const min = Math.round(sorted[0] * 10) / 10;
  const max = Math.round(sorted[sorted.length - 1] * 10) / 10;
  return { avg, median, p85, min, max, count: sorted.length };
}

/**
 * Build CFD data: for each day, count how many tasks are in each column.
 * Uses TaskHistory to replay state day by day.
 */
async function buildCFD(projectId, project, since, days) {
  const sortedColumns = [...project.columns].sort((a, b) => a.order - b.order);
  const columnKeys = sortedColumns.map((c) => c.key);

  // Get all history entries for this project up to now
  const history = await TaskHistory.find({
    projectId,
    movedAt: { $lte: new Date() },
  }).sort({ movedAt: 1 });

  // Also include backlog as a pseudo-column for CFD
  const allStates = ['backlog', ...columnKeys];

  // Build task state at each point in time
  // Start by replaying history to build task→column map
  const taskState = {}; // taskId → current column/state

  // Replay all history entries
  const cfdData = [];

  for (let d = 0; d <= days; d++) {
    const date = new Date(since);
    date.setDate(since.getDate() + d);
    date.setHours(23, 59, 59, 999);

    // Advance taskState to include all entries up to this date
    while (
      history.length > 0 &&
      history[0] &&
      new Date(history[0].movedAt) <= date
    ) {
      const entry = history.shift();
      const tid = entry.taskId.toString();
      if (entry.toBacklog) {
        taskState[tid] = 'backlog';
      } else if (entry.toColumn) {
        taskState[tid] = entry.toColumn;
      }
    }

    // Count tasks in each state
    const dayCounts = {};
    allStates.forEach((s) => {
      dayCounts[s] = 0;
    });
    Object.values(taskState).forEach((state) => {
      if (dayCounts[state] !== undefined) {
        dayCounts[state]++;
      }
    });

    cfdData.push({
      date: date.toISOString().slice(0, 10),
      ...dayCounts,
    });
  }

  return { columns: allStates, data: cfdData };
}
