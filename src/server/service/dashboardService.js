import { findProjects } from '../repository/projectRepository.js';
import {
  findTasksForProjects,
  findUpcomingDeadlines,
} from '../repository/dashboardRepository.js';
import { computeStats } from '../utils/metricsUtils.js';
import { classifyProjectHealth } from '../utils/healthUtils.js';

export async function getDashboardData(userId, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const now = new Date();

  // 1. Get all projects for this user
  const projects = await findProjects(userId);
  if (projects.length === 0) {
    return {
      projects: [],
      aggregated: {
        totalTasks: 0,
        totalInProgress: 0,
        totalCompleted: 0,
        totalBacklog: 0,
        projectCount: 0,
      },
      upcomingDeadlines: [],
      teamCapacity: [],
    };
  }

  const projectIds = projects.map((p) => p._id);

  // 2. Batch-fetch all tasks + upcoming deadlines (2 DB queries)
  const [allTasks, deadlineTasks] = await Promise.all([
    findTasksForProjects(projectIds),
    findUpcomingDeadlines(projectIds, 14),
  ]);

  // 3. Group tasks by projectId
  const tasksByProject = {};
  for (const pid of projectIds) {
    tasksByProject[pid.toString()] = [];
  }
  for (const task of allTasks) {
    const key = task.projectId.toString();
    if (tasksByProject[key]) {
      tasksByProject[key].push(task);
    }
  }

  // 4. Compute per-project metrics
  let totalTasks = 0;
  let totalInProgress = 0;
  let totalCompleted = 0;
  let totalBacklog = 0;

  const projectResults = projects.map((project) => {
    const pid = project._id.toString();
    const tasks = tasksByProject[pid] || [];
    const boardTasks = tasks.filter((t) => !t.backlog);
    const backlogTasks = tasks.filter((t) => t.backlog);

    // Completed in period
    const completedTasks = tasks.filter(
      (t) => t.completedAt && t.startedAt && new Date(t.completedAt) >= since,
    );

    // Cycle times
    const cycleTimes = completedTasks.map(
      (t) =>
        (new Date(t.completedAt) - new Date(t.startedAt)) / (1000 * 60 * 60),
    );

    // WIP tasks (in-progress: have startedAt but no completedAt)
    const wipTasks = boardTasks.filter((t) => t.startedAt && !t.completedAt);

    // Throughput average (tasks/day)
    const throughputAvg =
      days > 0 ? Math.round((completedTasks.length / days) * 10) / 10 : 0;

    // WIP concerns (columns at or over limit)
    const wipConcerns = [];
    const sortedColumns = [...project.columns].sort(
      (a, b) => a.order - b.order,
    );
    const columnCounts = {};
    sortedColumns.forEach((c) => {
      columnCounts[c.key] = { title: c.title, count: 0, limit: c.wip || null };
    });
    boardTasks.forEach((t) => {
      if (t.columnKey && columnCounts[t.columnKey]) {
        columnCounts[t.columnKey].count++;
      }
    });
    for (const col of Object.values(columnCounts)) {
      if (col.limit && col.count >= col.limit) {
        wipConcerns.push({
          column: col.title,
          title: col.title,
          count: col.count,
          limit: col.limit,
        });
      }
    }

    // Aging tasks (in-progress tasks with age)
    const agingTasks = wipTasks.map((t) => ({
      taskId: t._id,
      title: t.title,
      column: t.columnKey,
      ageHours:
        Math.round(((now - new Date(t.startedAt)) / (1000 * 60 * 60)) * 10) /
        10,
      priority: t.priority,
    }));

    // Health classification
    const { health, healthReasons } = classifyProjectHealth(
      wipConcerns,
      agingTasks,
      throughputAvg,
      wipTasks.length > 0,
    );

    // Determine user role in this project
    const ownerId =
      typeof project.ownerId === 'object' && project.ownerId._id
        ? project.ownerId._id.toString()
        : project.ownerId.toString();
    const role = ownerId === userId ? 'owner' : 'member';

    // Aggregate totals
    totalTasks += tasks.length;
    totalInProgress += wipTasks.length;
    totalCompleted += completedTasks.length;
    totalBacklog += backlogTasks.length;

    return {
      projectId: project._id,
      name: project.name,
      role,
      health,
      healthReasons,
      summary: {
        totalTasks: tasks.length,
        boardTasks: boardTasks.length,
        backlogTasks: backlogTasks.length,
        completedInPeriod: completedTasks.length,
        inProgress: wipTasks.length,
      },
      cycleTime: computeStats(cycleTimes),
      throughputAvg,
      wipConcerns,
      agingTasks: agingTasks
        .sort((a, b) => b.ageHours - a.ageHours)
        .slice(0, 5),
    };
  });

  // 5. Upcoming deadlines
  const upcomingDeadlines = deadlineTasks
    .map((t) => {
      const project = projects.find(
        (p) => p._id.toString() === t.projectId.toString(),
      );
      const daysUntilDue = Math.ceil(
        (new Date(t.dueDate) - now) / (1000 * 60 * 60 * 24),
      );
      return {
        taskId: t._id,
        title: t.title,
        projectId: t.projectId,
        projectName: project?.name || 'Unknown',
        dueDate: t.dueDate,
        daysUntilDue,
        priority: t.priority,
        assigneeName: t.assigneeId?.name || null,
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // 6. Team capacity — aggregate assignee workload across projects
  const assigneeMap = {};
  for (const task of allTasks) {
    if (!task.assigneeId || task.completedAt) continue;
    const assigneeId = task.assigneeId.toString();
    const projectId = task.projectId.toString();

    if (!assigneeMap[assigneeId]) {
      assigneeMap[assigneeId] = { assignments: {}, totalTasks: 0 };
    }
    if (!assigneeMap[assigneeId].assignments[projectId]) {
      assigneeMap[assigneeId].assignments[projectId] = 0;
    }
    assigneeMap[assigneeId].assignments[projectId]++;
    assigneeMap[assigneeId].totalTasks++;
  }

  // Build user info map from project members
  const userInfoMap = {};
  for (const project of projects) {
    // Owner
    if (project.ownerId && typeof project.ownerId === 'object') {
      const uid = project.ownerId._id?.toString();
      if (uid && !userInfoMap[uid]) {
        userInfoMap[uid] = {
          name: project.ownerId.name || project.ownerId.email,
          role: 'owner',
        };
      }
    }
    // Members
    for (const member of project.members || []) {
      const memberUser =
        typeof member.userId === 'object' ? member.userId : null;
      if (memberUser) {
        const uid = memberUser._id?.toString();
        if (uid && !userInfoMap[uid]) {
          userInfoMap[uid] = {
            name: memberUser.name || memberUser.email,
            role: member.role || 'member',
          };
        }
      }
    }
  }

  // Build project name map
  const projectNameMap = {};
  for (const p of projects) {
    projectNameMap[p._id.toString()] = p.name;
  }

  const teamCapacity = Object.entries(assigneeMap)
    .map(([uid, data]) => ({
      userId: uid,
      name: userInfoMap[uid]?.name || 'Unknown',
      role: userInfoMap[uid]?.role || 'member',
      assignments: Object.entries(data.assignments).map(([pid, count]) => ({
        projectId: pid,
        projectName: projectNameMap[pid] || 'Unknown',
        taskCount: count,
      })),
      totalTasks: data.totalTasks,
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks);

  return {
    projects: projectResults,
    aggregated: {
      totalTasks,
      totalInProgress,
      totalCompleted,
      totalBacklog,
      projectCount: projects.length,
    },
    upcomingDeadlines,
    teamCapacity,
  };
}
