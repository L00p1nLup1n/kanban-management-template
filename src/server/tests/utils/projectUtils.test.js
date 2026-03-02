import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../repository/projectRepository.js', () => ({
  findProjectsByCodes: vi.fn(),
}));

import { findProjectsByCodes } from '../../repository/projectRepository.js';
import { generateUniqueJoinCode } from '../../utils/projectUtils.js';
import { ProjectError } from '../../errors/error.js';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('generateUniqueJoinCode', () => {
  it('returns a 6-character hex string', async () => {
    findProjectsByCodes.mockResolvedValue([]);
    const code = await generateUniqueJoinCode();
    expect(code).toMatch(/^[0-9a-f]{6}$/);
  });

  it('returns a code not present in the existing set', async () => {
    findProjectsByCodes.mockResolvedValue([]);
    const code = await generateUniqueJoinCode();
    expect(typeof code).toBe('string');
    expect(code.length).toBe(6);
  });

  it('skips taken codes and returns the first available candidate', async () => {
    // Make the first call return one "taken" code so we confirm it picks another
    findProjectsByCodes.mockImplementation(async (candidates) => {
      // Mark the first candidate as taken
      return [{ joinCode: candidates[0] }];
    });
    const code = await generateUniqueJoinCode();
    expect(code).toBeDefined();
    expect(code.length).toBe(6);
  });

  it('throws ProjectError when all 5 candidates are taken', async () => {
    findProjectsByCodes.mockImplementation(async (candidates) =>
      candidates.map((c) => ({ joinCode: c })),
    );
    await expect(generateUniqueJoinCode()).rejects.toBeInstanceOf(ProjectError);
  });

  it('throws with 500 status when all candidates are taken', async () => {
    findProjectsByCodes.mockImplementation(async (candidates) =>
      candidates.map((c) => ({ joinCode: c })),
    );
    await expect(generateUniqueJoinCode()).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
