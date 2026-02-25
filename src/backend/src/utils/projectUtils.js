import { findProjectsByCodes } from '../repository/projectRepository.js';
import { ProjectError } from '../errors/error.js';
import crypto from 'crypto';

export async function generateUniqueJoinCode() {
  // increase BATCH_SIZE to avoid collision better
  const BATCH_SIZE = 5;
  const candidates = Array.from({ length: BATCH_SIZE }, () =>
    crypto.randomBytes(3).toString('hex'),
  );
  const existing = await findProjectsByCodes(candidates);
  const takenCodes = new Set(existing.map((p) => p.joinCode));
  const uniqueCode = candidates.find((code) => !takenCodes.has(code));
  if (!uniqueCode) {
    throw new ProjectError(500, 'Unable to generate unique join code');
  }
  return uniqueCode;
}
