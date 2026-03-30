import { describe, it, expect } from 'vitest';
import { computeStats } from '../../utils/metricsUtils.js';

describe('computeStats', () => {
  it('returns zeros for an empty array', () => {
    const result = computeStats([]);
    expect(result).toEqual({
      avg: 0,
      median: 0,
      p85: 0,
      min: 0,
      max: 0,
      count: 0,
    });
  });

  it('handles a single value', () => {
    const result = computeStats([10]);
    expect(result.avg).toBe(10);
    expect(result.median).toBe(10);
    expect(result.p85).toBe(10);
    expect(result.min).toBe(10);
    expect(result.max).toBe(10);
    expect(result.count).toBe(1);
  });

  it('computes correct stats for multiple values', () => {
    const values = [2, 4, 6, 8, 10];
    const result = computeStats(values);
    expect(result.avg).toBe(6);
    expect(result.median).toBe(6);
    expect(result.min).toBe(2);
    expect(result.max).toBe(10);
    expect(result.count).toBe(5);
  });

  it('computes p85 correctly', () => {
    // 10 values: p85 index = floor(10 * 0.85) = 8
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = computeStats(values);
    expect(result.p85).toBe(9);
  });

  it('rounds values to one decimal place', () => {
    const values = [1, 2, 3];
    const result = computeStats(values);
    expect(result.avg).toBe(2); // 6/3 = 2.0
    expect(result.median).toBe(2);
  });

  it('does not mutate the input array', () => {
    const values = [5, 3, 1, 4, 2];
    const copy = [...values];
    computeStats(values);
    expect(values).toEqual(copy);
  });
});
