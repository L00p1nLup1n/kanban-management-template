import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../repository/userRepository.js', () => ({
  create: vi.fn(),
  findByEmail: vi.fn(),
  findById: vi.fn(),
  getTimeStamps: vi.fn(),
}));

// Mock bcrypt to avoid real salt rounds (~100ms each)
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import * as userRepo from '../../repository/userRepository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  createUser,
  verifyCredentials,
  generateTokenForUser,
  getUserTimestamps,
} from '../../service/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── createUser ───────────────────────────────────────────────────────────────

describe('createUser', () => {
  it('hashes the password before storing', async () => {
    bcrypt.hash.mockResolvedValue('$hashed$');
    userRepo.create.mockResolvedValue({ _id: 'u1', email: 'a@b.com' });
    await createUser('a@b.com', 'plaintext', 'Alice');
    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
  });

  it('calls create with the hashed password, not the plain one', async () => {
    bcrypt.hash.mockResolvedValue('$hashed$');
    userRepo.create.mockResolvedValue({ _id: 'u1', email: 'a@b.com' });
    await createUser('a@b.com', 'plaintext', 'Alice');
    expect(userRepo.create).toHaveBeenCalledWith(
      'a@b.com',
      '$hashed$',
      'Alice',
    );
  });

  it('returns the created user document', async () => {
    const fakeUser = { _id: 'u1', email: 'a@b.com', name: 'Alice' };
    bcrypt.hash.mockResolvedValue('$hashed$');
    userRepo.create.mockResolvedValue(fakeUser);
    const result = await createUser('a@b.com', 'plaintext', 'Alice');
    expect(result).toBe(fakeUser);
  });
});

// ─── verifyCredentials ────────────────────────────────────────────────────────

describe('verifyCredentials', () => {
  const user = { passwordHash: '$hashed$' };

  it('returns true when password matches the hash', async () => {
    bcrypt.compare.mockResolvedValue(true);
    const result = await verifyCredentials(user, 'correct');
    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith('correct', '$hashed$');
  });

  it('returns false when password does not match', async () => {
    bcrypt.compare.mockResolvedValue(false);
    const result = await verifyCredentials(user, 'wrong');
    expect(result).toBe(false);
  });
});

// ─── generateTokenForUser ─────────────────────────────────────────────────────

describe('generateTokenForUser', () => {
  it('returns a string token', async () => {
    const token = await generateTokenForUser({ _id: 'user-001' });
    expect(typeof token).toBe('string');
  });

  it('encodes userId in the JWT payload', async () => {
    const token = await generateTokenForUser({ _id: 'user-001' });
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('user-001');
  });

  it('token expires in approximately 30 minutes', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await generateTokenForUser({ _id: 'user-001' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const expiresIn = decoded.exp - before;
    expect(expiresIn).toBeGreaterThanOrEqual(29 * 60);
    expect(expiresIn).toBeLessThanOrEqual(31 * 60);
  });
});

// ─── getUserTimestamps ────────────────────────────────────────────────────────

describe('getUserTimestamps', () => {
  it('returns null when user is not found', async () => {
    userRepo.getTimeStamps.mockResolvedValue(null);
    const result = await getUserTimestamps('nonexistent');
    expect(result).toBeNull();
  });

  it('returns formatted createdAt and updatedAt strings', async () => {
    userRepo.getTimeStamps.mockResolvedValue({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    });
    const result = await getUserTimestamps('u1');
    expect(typeof result.createdAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');
    expect(result.createdAt.length).toBeGreaterThan(0);
  });
});
