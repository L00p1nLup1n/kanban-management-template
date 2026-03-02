import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../repository/taskRepository.js', () => ({
  findBoardTasks: vi.fn(),
  findBacklogTasks: vi.fn(),
  findTaskById: vi.fn(),
  countTasksInColumn: vi.fn(),
  insertTask: vi.fn(),
  saveTask: vi.fn(),
  deleteTaskById: vi.fn(),
  findAllBoardTasks: vi.fn(),
  bulkWriteTasks: vi.fn(),
  bulkInsertTasks: vi.fn(),
  insertTaskHistory: vi.fn(),
}));

import * as repo from '../../repository/taskRepository.js';
import {
  createBoardTask,
  updateTask,
  moveTask,
  deleteTask,
  reorderTasks,
  TaskOutcome,
} from '../../service/taskService.js';
import {
  makeProject,
  makeTask,
  OWNER_ID,
  MEMBER_ID,
  TASK_ID,
} from '../helpers/factories.js';

const ASSIGNEE_ID = 'assignee-007';

const PROJECT = makeProject({
  columns: [
    { key: 'todo', title: 'To do', order: 1, wip: 0 },
    { key: 'inprogress', title: 'In Progress', order: 2, wip: 3 },
    { key: 'done', title: 'Done', order: 3, wip: 0 },
  ],
});

beforeEach(() => {
  vi.resetAllMocks();
  repo.insertTaskHistory.mockResolvedValue({});
  repo.saveTask.mockResolvedValue({});
});

// ─── createBoardTask ──────────────────────────────────────────────────────────

describe('createBoardTask', () => {
  it('returns VALIDATION_ERROR when title is missing', async () => {
    const result = await createBoardTask(PROJECT, OWNER_ID, {
      order: 1000,
      columnKey: 'todo',
    });
    expect(result.outcome).toBe(TaskOutcome.VALIDATION_ERROR);
  });

  it('returns VALIDATION_ERROR when order is undefined', async () => {
    const result = await createBoardTask(PROJECT, OWNER_ID, {
      title: 'Task',
      columnKey: 'todo',
    });
    expect(result.outcome).toBe(TaskOutcome.VALIDATION_ERROR);
  });

  it('returns VALIDATION_ERROR when columnKey is missing', async () => {
    const result = await createBoardTask(PROJECT, OWNER_ID, {
      title: 'Task',
      order: 1000,
    });
    expect(result.outcome).toBe(TaskOutcome.VALIDATION_ERROR);
  });

  it('returns NOT_OWNER when caller is not the project owner', async () => {
    const result = await createBoardTask(PROJECT, MEMBER_ID, {
      title: 'Task',
      order: 1000,
      columnKey: 'todo',
    });
    expect(result.outcome).toBe(TaskOutcome.NOT_OWNER);
  });

  it('returns COLUMN_NOT_FOUND when columnKey does not exist', async () => {
    const result = await createBoardTask(PROJECT, OWNER_ID, {
      title: 'Task',
      order: 1000,
      columnKey: 'nonexistent',
    });
    expect(result.outcome).toBe(TaskOutcome.COLUMN_NOT_FOUND);
  });

  it('returns WIP_EXCEEDED with details when column is at its limit', async () => {
    repo.countTasksInColumn.mockResolvedValue(3);
    const result = await createBoardTask(PROJECT, OWNER_ID, {
      title: 'Task',
      order: 1000,
      columnKey: 'inprogress',
    });
    expect(result.outcome).toBe(TaskOutcome.WIP_EXCEEDED);
    expect(result.details).toMatchObject({
      columnKey: 'inprogress',
      wip: 3,
      count: 3,
    });
  });

  it('does not check WIP when wip is 0', async () => {
    repo.insertTask.mockResolvedValue(makeTask());
    await createBoardTask(PROJECT, OWNER_ID, {
      title: 'Task',
      order: 1000,
      columnKey: 'todo', // wip: 0
    });
    expect(repo.countTasksInColumn).not.toHaveBeenCalled();
  });

  it('does not check WIP when wip is undefined', async () => {
    const project = makeProject({
      columns: [{ key: 'todo', title: 'To do', order: 1 }],
    });
    repo.insertTask.mockResolvedValue(makeTask());
    await createBoardTask(project, OWNER_ID, {
      title: 'Task',
      order: 1000,
      columnKey: 'todo',
    });
    expect(repo.countTasksInColumn).not.toHaveBeenCalled();
  });

  it('returns CREATED and records history on success', async () => {
    repo.insertTask.mockResolvedValue(makeTask({ _id: 'new-task' }));
    const result = await createBoardTask(PROJECT, OWNER_ID, {
      title: 'New Task',
      order: 1000,
      columnKey: 'todo',
    });
    expect(result.outcome).toBe(TaskOutcome.CREATED);
    expect(result.task).toBeDefined();
    expect(repo.insertTaskHistory).toHaveBeenCalledOnce();
    expect(repo.insertTaskHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        toColumn: 'todo',
        fromColumn: null,
        toBacklog: false,
      }),
    );
  });
});

// ─── updateTask ───────────────────────────────────────────────────────────────

describe('updateTask', () => {
  it('returns TASK_NOT_FOUND when task does not exist', async () => {
    repo.findTaskById.mockResolvedValue(null);
    const result = await updateTask(PROJECT, TASK_ID, OWNER_ID, { title: 'x' });
    expect(result.outcome).toBe(TaskOutcome.TASK_NOT_FOUND);
  });

  it('returns NOT_AUTHORIZED when caller is neither owner nor assignee', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ assigneeId: null }));
    const result = await updateTask(PROJECT, TASK_ID, MEMBER_ID, {
      title: 'x',
    });
    expect(result.outcome).toBe(TaskOutcome.NOT_AUTHORIZED);
  });

  it('returns NOT_AUTHORIZED when assignee tries to update non-status fields', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ assigneeId: ASSIGNEE_ID }));
    const result = await updateTask(PROJECT, TASK_ID, ASSIGNEE_ID, {
      title: 'new title',
    });
    expect(result.outcome).toBe(TaskOutcome.NOT_AUTHORIZED);
  });

  it('allows assignee to update only status timestamp fields', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ assigneeId: ASSIGNEE_ID }));
    const result = await updateTask(PROJECT, TASK_ID, ASSIGNEE_ID, {
      startedAt: new Date(),
    });
    expect(result.outcome).toBe(TaskOutcome.UPDATED);
  });

  it('returns COLUMN_NOT_FOUND when owner changes to invalid column', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    const result = await updateTask(PROJECT, TASK_ID, OWNER_ID, {
      columnKey: 'nonexistent',
    });
    expect(result.outcome).toBe(TaskOutcome.COLUMN_NOT_FOUND);
  });

  it('returns WIP_EXCEEDED when owner changes to a full column', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    repo.countTasksInColumn.mockResolvedValue(3);
    const result = await updateTask(PROJECT, TASK_ID, OWNER_ID, {
      columnKey: 'inprogress',
    });
    expect(result.outcome).toBe(TaskOutcome.WIP_EXCEEDED);
    expect(result.details).toMatchObject({ columnKey: 'inprogress', wip: 3 });
  });

  it('excludes the current task from WIP count when moving within same column', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'inprogress' }));
    repo.countTasksInColumn.mockResolvedValue(2); // under wip limit of 3
    const result = await updateTask(PROJECT, TASK_ID, OWNER_ID, {
      columnKey: 'inprogress',
    });
    // No WIP check triggered (same column → no columnChanging path)
    expect(result.outcome).toBe(TaskOutcome.UPDATED);
  });

  it('records history when column changes', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    repo.countTasksInColumn.mockResolvedValue(1);
    await updateTask(PROJECT, TASK_ID, OWNER_ID, { columnKey: 'inprogress' });
    expect(repo.insertTaskHistory).toHaveBeenCalledOnce();
    expect(repo.insertTaskHistory).toHaveBeenCalledWith(
      expect.objectContaining({ fromColumn: 'todo', toColumn: 'inprogress' }),
    );
  });

  it('does not record history when column does not change', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    await updateTask(PROJECT, TASK_ID, OWNER_ID, { title: 'Updated title' });
    expect(repo.insertTaskHistory).not.toHaveBeenCalled();
  });

  it('returns UPDATED on success', async () => {
    repo.findTaskById.mockResolvedValue(makeTask());
    const result = await updateTask(PROJECT, TASK_ID, OWNER_ID, {
      title: 'New title',
    });
    expect(result.outcome).toBe(TaskOutcome.UPDATED);
  });
});

// ─── moveTask ─────────────────────────────────────────────────────────────────

describe('moveTask', () => {
  it('returns TASK_NOT_FOUND when task does not exist', async () => {
    repo.findTaskById.mockResolvedValue(null);
    const result = await moveTask(PROJECT, TASK_ID, OWNER_ID, {
      toColumnKey: 'todo',
    });
    expect(result.outcome).toBe(TaskOutcome.TASK_NOT_FOUND);
  });

  it('moves task to backlog and clears column and timestamps', async () => {
    const task = makeTask({ columnKey: 'todo' });
    repo.findTaskById.mockResolvedValue(task);
    const result = await moveTask(PROJECT, TASK_ID, OWNER_ID, {
      backlog: true,
    });
    expect(result.outcome).toBe(TaskOutcome.MOVED);
    expect(task.backlog).toBe(true);
    expect(task.columnKey).toBeUndefined();
    expect(task.committedAt).toBeUndefined();
    expect(task.startedAt).toBeUndefined();
    expect(task.completedAt).toBeUndefined();
  });

  it('records history with toBacklog:true when moving to backlog', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    await moveTask(PROJECT, TASK_ID, OWNER_ID, { backlog: true });
    expect(repo.insertTaskHistory).toHaveBeenCalledWith(
      expect.objectContaining({ toBacklog: true, fromBacklog: false }),
    );
  });

  it('returns VALIDATION_ERROR when toColumnKey is absent and backlog is false', async () => {
    repo.findTaskById.mockResolvedValue(makeTask());
    const result = await moveTask(PROJECT, TASK_ID, OWNER_ID, {
      backlog: false,
    });
    expect(result.outcome).toBe(TaskOutcome.VALIDATION_ERROR);
  });

  it('returns COLUMN_NOT_FOUND when toColumnKey is invalid', async () => {
    repo.findTaskById.mockResolvedValue(makeTask());
    const result = await moveTask(PROJECT, TASK_ID, OWNER_ID, {
      toColumnKey: 'bogus',
    });
    expect(result.outcome).toBe(TaskOutcome.COLUMN_NOT_FOUND);
  });

  it('returns WIP_EXCEEDED when target column is at WIP limit', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    repo.countTasksInColumn.mockResolvedValue(3);
    const result = await moveTask(PROJECT, TASK_ID, OWNER_ID, {
      toColumnKey: 'inprogress',
    });
    expect(result.outcome).toBe(TaskOutcome.WIP_EXCEEDED);
    expect(result.details).toMatchObject({ columnKey: 'inprogress', wip: 3 });
  });

  it('sets backlog=false when moving from backlog to a column', async () => {
    const task = makeTask({ backlog: true, columnKey: undefined });
    repo.findTaskById.mockResolvedValue(task);
    repo.countTasksInColumn.mockResolvedValue(0);
    await moveTask(PROJECT, TASK_ID, OWNER_ID, { toColumnKey: 'todo' });
    expect(task.backlog).toBe(false);
    expect(task.columnKey).toBe('todo');
  });

  it('records history with fromBacklog:true when coming from backlog', async () => {
    repo.findTaskById.mockResolvedValue(
      makeTask({ backlog: true, columnKey: undefined }),
    );
    repo.countTasksInColumn.mockResolvedValue(0);
    await moveTask(PROJECT, TASK_ID, OWNER_ID, { toColumnKey: 'todo' });
    expect(repo.insertTaskHistory).toHaveBeenCalledWith(
      expect.objectContaining({ fromBacklog: true, toBacklog: false }),
    );
  });

  it('returns MOVED on success', async () => {
    repo.findTaskById.mockResolvedValue(makeTask({ columnKey: 'todo' }));
    repo.countTasksInColumn.mockResolvedValue(0);
    const result = await moveTask(PROJECT, TASK_ID, OWNER_ID, {
      toColumnKey: 'inprogress',
    });
    expect(result.outcome).toBe(TaskOutcome.MOVED);
  });
});

// ─── deleteTask ───────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('returns TASK_NOT_FOUND when task does not exist', async () => {
    repo.findTaskById.mockResolvedValue(null);
    const result = await deleteTask(PROJECT, TASK_ID, OWNER_ID);
    expect(result.outcome).toBe(TaskOutcome.TASK_NOT_FOUND);
  });

  it('returns NOT_OWNER when caller is not the project owner', async () => {
    repo.findTaskById.mockResolvedValue(makeTask());
    const result = await deleteTask(PROJECT, TASK_ID, MEMBER_ID);
    expect(result.outcome).toBe(TaskOutcome.NOT_OWNER);
  });

  it('calls deleteTaskById and returns DELETED on success', async () => {
    repo.findTaskById.mockResolvedValue(makeTask());
    repo.deleteTaskById.mockResolvedValue({});
    const result = await deleteTask(PROJECT, TASK_ID, OWNER_ID);
    expect(repo.deleteTaskById).toHaveBeenCalledWith(TASK_ID);
    expect(result.outcome).toBe(TaskOutcome.DELETED);
    expect(result.taskId).toBe(TASK_ID);
  });
});

// ─── reorderTasks ─────────────────────────────────────────────────────────────

describe('reorderTasks', () => {
  it('returns VALIDATION_ERROR when tasksArray is not an array', async () => {
    const result = await reorderTasks(PROJECT, null);
    expect(result.outcome).toBe(TaskOutcome.VALIDATION_ERROR);
  });

  it('returns REORDERED on success with no column changes', async () => {
    repo.findAllBoardTasks.mockResolvedValue([
      { _id: 'task-1', columnKey: 'todo' },
      { _id: 'task-2', columnKey: 'todo' },
    ]);
    repo.bulkWriteTasks.mockResolvedValue({});
    const tasks = [
      { id: 'task-1', order: 2000, columnKey: 'todo' },
      { id: 'task-2', order: 1000, columnKey: 'todo' },
    ];
    const result = await reorderTasks(PROJECT, tasks);
    expect(result.outcome).toBe(TaskOutcome.REORDERED);
    expect(result.tasks).toBe(tasks);
  });

  it('returns WIP_EXCEEDED with violations when reorder would exceed WIP', async () => {
    // inprogress has wip:3, currently has 3 tasks, moving one more in would be 4
    repo.findAllBoardTasks.mockResolvedValue([
      { _id: 'task-1', columnKey: 'todo' },
      { _id: 'task-2', columnKey: 'inprogress' },
      { _id: 'task-3', columnKey: 'inprogress' },
      { _id: 'task-4', columnKey: 'inprogress' },
    ]);
    const tasks = [
      { id: 'task-1', order: 1000, columnKey: 'inprogress' }, // moving from todo → inprogress
    ];
    const result = await reorderTasks(PROJECT, tasks);
    expect(result.outcome).toBe(TaskOutcome.WIP_EXCEEDED);
    expect(result.details.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columnKey: 'inprogress' }),
      ]),
    );
  });

  it('calls bulkWriteTasks with correct operations', async () => {
    repo.findAllBoardTasks.mockResolvedValue([
      { _id: 'task-1', columnKey: 'todo' },
    ]);
    repo.bulkWriteTasks.mockResolvedValue({});
    await reorderTasks(PROJECT, [
      { id: 'task-1', order: 500, columnKey: 'todo' },
    ]);
    expect(repo.bulkWriteTasks).toHaveBeenCalledOnce();
    const [ops] = repo.bulkWriteTasks.mock.calls[0];
    expect(ops[0]).toMatchObject({
      updateOne: {
        filter: { _id: 'task-1' },
        update: { order: 500, columnKey: 'todo' },
      },
    });
  });
});
