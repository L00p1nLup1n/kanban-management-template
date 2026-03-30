import { describe, it, expect } from 'vitest';
import { classifyProjectHealth } from '../../utils/healthUtils.js';

describe('classifyProjectHealth', () => {
  it('returns on_track when no concerns', () => {
    const result = classifyProjectHealth([], [], 1.5, true);
    expect(result.health).toBe('on_track');
    expect(result.healthReasons).toEqual([]);
  });

  it('returns blocked when WIP over limit AND tasks aging > 5 days', () => {
    const wipConcerns = [{ title: 'In Progress', count: 5, limit: 3 }];
    const agingTasks = [{ ageHours: 130 }]; // > 120 hours = 5 days
    const result = classifyProjectHealth(wipConcerns, agingTasks, 0.5, true);
    expect(result.health).toBe('blocked');
    expect(result.healthReasons.length).toBeGreaterThan(0);
  });

  it('returns at_risk when WIP at limit but no severe aging', () => {
    const wipConcerns = [{ title: 'In Progress', count: 3, limit: 3 }];
    const agingTasks = [{ ageHours: 50 }]; // < 72 hours
    const result = classifyProjectHealth(wipConcerns, agingTasks, 1.0, true);
    expect(result.health).toBe('at_risk');
    expect(result.healthReasons).toContain(
      'WIP at/over limit on "In Progress" (3/3)',
    );
  });

  it('returns at_risk when tasks aging > 3 days', () => {
    const agingTasks = [{ ageHours: 80 }]; // > 72 hours = 3 days
    const result = classifyProjectHealth([], agingTasks, 1.0, true);
    expect(result.health).toBe('at_risk');
    expect(result.healthReasons).toContain('1 task(s) aging over 3 days');
  });

  it('returns at_risk when zero throughput with in-progress tasks', () => {
    const result = classifyProjectHealth([], [], 0, true);
    expect(result.health).toBe('at_risk');
    expect(result.healthReasons).toContain(
      'Zero throughput in period with in-progress tasks',
    );
  });

  it('returns on_track when zero throughput but no in-progress tasks', () => {
    const result = classifyProjectHealth([], [], 0, false);
    expect(result.health).toBe('on_track');
  });

  it('ignores WIP concerns without a limit set', () => {
    const wipConcerns = [{ title: 'To do', count: 10, limit: null }];
    const result = classifyProjectHealth(wipConcerns, [], 1.0, true);
    expect(result.health).toBe('on_track');
  });

  it('returns blocked with multiple reasons', () => {
    const wipConcerns = [
      { title: 'In Progress', count: 6, limit: 3 },
      { title: 'Review', count: 4, limit: 2 },
    ];
    const agingTasks = [{ ageHours: 200 }, { ageHours: 150 }];
    const result = classifyProjectHealth(wipConcerns, agingTasks, 0, true);
    expect(result.health).toBe('blocked');
    expect(result.healthReasons.length).toBe(3); // 2 WIP + 1 aging
  });
});
