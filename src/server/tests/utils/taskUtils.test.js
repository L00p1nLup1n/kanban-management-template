import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getColumnPosition,
  applyAutoTimestamps,
} from '../../utils/taskUtils.js';
import { makeTask } from '../helpers/factories.js';

const FIXED_NOW = new Date('2025-01-15T10:00:00.000Z');

const PROJECT = {
  columns: [
    { key: 'done', order: 3 },
    { key: 'todo', order: 1 }, // intentionally out of array order
    { key: 'inprogress', order: 2 },
  ],
};

describe('getColumnPosition', () => {
  it('returns null for an unknown columnKey', () => {
    expect(getColumnPosition(PROJECT, 'nonexistent')).toBeNull();
  });

  it('identifies first column by order value, not array position', () => {
    const pos = getColumnPosition(PROJECT, 'todo');
    expect(pos.isFirst).toBe(true);
    expect(pos.isLast).toBe(false);
  });

  it('identifies last column correctly', () => {
    const pos = getColumnPosition(PROJECT, 'done');
    expect(pos.isFirst).toBe(false);
    expect(pos.isLast).toBe(true);
  });

  it('returns isFirst and isLast both false for a middle column', () => {
    const pos = getColumnPosition(PROJECT, 'inprogress');
    expect(pos.isFirst).toBe(false);
    expect(pos.isLast).toBe(false);
  });

  it('returns the correct order value', () => {
    expect(getColumnPosition(PROJECT, 'inprogress').order).toBe(2);
  });
});

describe('applyAutoTimestamps', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when columnKey is not in project', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'nonexistent');
    expect(task.committedAt).toBeUndefined();
    expect(task.startedAt).toBeUndefined();
    expect(task.completedAt).toBeUndefined();
  });

  it('sets committedAt when task enters any column and committedAt is unset', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'todo');
    expect(task.committedAt).toEqual(FIXED_NOW);
  });

  it('does NOT overwrite an existing committedAt', () => {
    const existing = new Date('2025-01-01T00:00:00.000Z');
    const task = makeTask({ committedAt: existing });
    applyAutoTimestamps(task, PROJECT, 'todo');
    expect(task.committedAt).toEqual(existing);
  });

  it('does NOT set startedAt when task enters the first column', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'todo');
    expect(task.startedAt).toBeUndefined();
  });

  it('sets startedAt when task enters a non-first column', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'inprogress');
    expect(task.startedAt).toEqual(FIXED_NOW);
  });

  it('does NOT overwrite an existing startedAt', () => {
    const existing = new Date('2025-01-01T00:00:00.000Z');
    const task = makeTask({ startedAt: existing });
    applyAutoTimestamps(task, PROJECT, 'inprogress');
    expect(task.startedAt).toEqual(existing);
  });

  it('does NOT set completedAt for a non-last column', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'inprogress');
    expect(task.completedAt).toBeUndefined();
  });

  it('sets completedAt when task enters the last column', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'done');
    expect(task.completedAt).toEqual(FIXED_NOW);
  });

  it('does NOT overwrite an existing completedAt', () => {
    const existing = new Date('2025-01-01T00:00:00.000Z');
    const task = makeTask({ completedAt: existing });
    applyAutoTimestamps(task, PROJECT, 'done');
    expect(task.completedAt).toEqual(existing);
  });

  it('sets both startedAt and completedAt when jumping directly to last column', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'done');
    expect(task.startedAt).toEqual(FIXED_NOW);
    expect(task.completedAt).toEqual(FIXED_NOW);
  });

  it('mutates the task object in place', () => {
    const task = makeTask();
    applyAutoTimestamps(task, PROJECT, 'todo');
    expect(task.committedAt).toBeDefined();
  });
});
