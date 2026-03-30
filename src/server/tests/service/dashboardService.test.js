import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../repository/projectRepository.js', () => ({
  findProjects: vi.fn(),
}));

vi.mock('../../repository/dashboardRepository.js', () => ({
  findTasksForProjects: vi.fn(),
  findUpcomingDeadlines: vi.fn(),
}));

import { findProjects } from '../../repository/projectRepository.js';
import {
  findTasksForProjects,
  findUpcomingDeadlines,
} from '../../repository/dashboardRepository.js';
import { getDashboardData } from '../../service/dashboardService.js';
import {
  OWNER_ID,
  PROJECT_ID,
  makePopulatedProject,
} from '../helpers/factories.js';

const USER_ID = OWNER_ID;

function makeTaskObj(overrides = {}) {
  return {
    _id: overrides._id || 'task-1',
    projectId: { toString: () => overrides.projectId || PROJECT_ID },
    columnKey: 'todo',
    title: 'Test Task',
    backlog: false,
    startedAt: null,
    completedAt: null,
    assigneeId: null,
    priority: 'medium',
    dueDate: null,
    ...overrides,
    // Ensure projectId has toString
    ...(overrides.projectId
      ? { projectId: { toString: () => overrides.projectId } }
      : {}),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getDashboardData', () => {
  it('returns empty dashboard when user has no projects', async () => {
    findProjects.mockResolvedValue([]);

    const result = await getDashboardData(USER_ID, 30);

    expect(result.projects).toEqual([]);
    expect(result.aggregated.projectCount).toBe(0);
    expect(result.upcomingDeadlines).toEqual([]);
    expect(result.teamCapacity).toEqual([]);
  });

  it('returns correct aggregated totals across projects', async () => {
    const project = makePopulatedProject();
    findProjects.mockResolvedValue([project]);

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    findTasksForProjects.mockResolvedValue([
      makeTaskObj({ _id: 't1', columnKey: 'todo' }),
      makeTaskObj({
        _id: 't2',
        columnKey: 'inprogress',
        startedAt: threeDaysAgo,
      }),
      makeTaskObj({
        _id: 't3',
        columnKey: 'done',
        startedAt: threeDaysAgo,
        completedAt: oneDayAgo,
      }),
      makeTaskObj({ _id: 't4', backlog: true }),
    ]);
    findUpcomingDeadlines.mockResolvedValue([]);

    const result = await getDashboardData(USER_ID, 30);

    expect(result.aggregated.totalTasks).toBe(4);
    expect(result.aggregated.totalInProgress).toBe(1);
    expect(result.aggregated.totalCompleted).toBe(1);
    expect(result.aggregated.totalBacklog).toBe(1);
    expect(result.aggregated.projectCount).toBe(1);
  });

  it('computes per-project health and cycle time', async () => {
    const project = makePopulatedProject({
      columns: [
        { key: 'todo', title: 'To do', order: 1, wip: 0 },
        { key: 'inprogress', title: 'In Progress', order: 2, wip: 2 },
        { key: 'done', title: 'Done', order: 3, wip: 0 },
      ],
    });
    findProjects.mockResolvedValue([project]);

    const now = new Date();
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    findTasksForProjects.mockResolvedValue([
      makeTaskObj({
        _id: 't1',
        columnKey: 'done',
        startedAt: fiveDaysAgo,
        completedAt: twoDaysAgo,
      }),
    ]);
    findUpcomingDeadlines.mockResolvedValue([]);

    const result = await getDashboardData(USER_ID, 30);

    expect(result.projects).toHaveLength(1);
    const proj = result.projects[0];
    expect(proj.name).toBe('Test Project');
    expect(proj.role).toBe('owner');
    expect(proj.cycleTime.count).toBe(1);
    expect(proj.cycleTime.avg).toBeGreaterThan(0);
  });

  it('includes upcoming deadlines sorted by due date', async () => {
    const project = makePopulatedProject();
    findProjects.mockResolvedValue([project]);
    findTasksForProjects.mockResolvedValue([]);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    findUpcomingDeadlines.mockResolvedValue([
      makeTaskObj({
        _id: 'd2',
        title: 'Later task',
        dueDate: nextWeek,
        assigneeId: { name: 'Bob', email: 'bob@test.com' },
      }),
      makeTaskObj({
        _id: 'd1',
        title: 'Urgent task',
        dueDate: tomorrow,
        assigneeId: { name: 'Alice', email: 'alice@test.com' },
      }),
    ]);

    const result = await getDashboardData(USER_ID, 30);

    expect(result.upcomingDeadlines).toHaveLength(2);
    expect(result.upcomingDeadlines[0].title).toBe('Urgent task');
    expect(result.upcomingDeadlines[0].assigneeName).toBe('Alice');
    expect(result.upcomingDeadlines[1].title).toBe('Later task');
  });

  it('computes team capacity across projects', async () => {
    const project = makePopulatedProject({
      members: [
        {
          userId: { _id: 'user-A', name: 'Alice', email: 'alice@test.com' },
          role: 'developer',
          joinedAt: new Date(),
        },
      ],
    });
    findProjects.mockResolvedValue([project]);

    findTasksForProjects.mockResolvedValue([
      makeTaskObj({ _id: 't1', assigneeId: { toString: () => 'user-A' } }),
      makeTaskObj({ _id: 't2', assigneeId: { toString: () => 'user-A' } }),
      makeTaskObj({
        _id: 't3',
        assigneeId: { toString: () => 'user-A' },
        completedAt: new Date(),
      }), // completed — should be excluded
    ]);
    findUpcomingDeadlines.mockResolvedValue([]);

    const result = await getDashboardData(USER_ID, 30);

    expect(result.teamCapacity).toHaveLength(1);
    expect(result.teamCapacity[0].userId).toBe('user-A');
    expect(result.teamCapacity[0].totalTasks).toBe(2);
    expect(result.teamCapacity[0].name).toBe('Alice');
  });

  it('classifies project as on_track when healthy', async () => {
    const project = makePopulatedProject();
    findProjects.mockResolvedValue([project]);

    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    findTasksForProjects.mockResolvedValue([
      makeTaskObj({
        _id: 't1',
        columnKey: 'done',
        startedAt: twoDaysAgo,
        completedAt: oneDayAgo,
      }),
    ]);
    findUpcomingDeadlines.mockResolvedValue([]);

    const result = await getDashboardData(USER_ID, 30);
    expect(result.projects[0].health).toBe('on_track');
  });
});
