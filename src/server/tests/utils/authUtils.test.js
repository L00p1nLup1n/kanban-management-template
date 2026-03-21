import { describe, it, expect } from 'vitest';
import {
  userHasProjectAccess,
  userIsProjectOwner,
  userIsProjectMember,
} from '../../utils/authUtils.js';
import {
  OWNER_ID,
  MEMBER_ID,
  STRANGER_ID,
  makeProject,
  makePopulatedProject,
  makeMember,
} from '../helpers/factories.js';

describe('userHasProjectAccess', () => {
  it('returns false when project is null', () => {
    expect(userHasProjectAccess(null, OWNER_ID)).toBe(false);
  });

  it('returns true for the owner (string ownerId)', () => {
    expect(userHasProjectAccess(makeProject(), OWNER_ID)).toBe(true);
  });

  it('returns true for the owner (populated ownerId._id)', () => {
    expect(userHasProjectAccess(makePopulatedProject(), OWNER_ID)).toBe(true);
  });

  it('returns true for a member (unpopulated userId in members array)', () => {
    const project = makeProject({ members: [makeMember(MEMBER_ID)] });
    expect(userHasProjectAccess(project, MEMBER_ID)).toBe(true);
  });

  it('returns true for a member (populated userId in members array)', () => {
    const project = makeProject({
      members: [makeMember({ _id: MEMBER_ID, email: 'member@test.com' })],
    });
    expect(userHasProjectAccess(project, MEMBER_ID)).toBe(true);
  });

  it('returns false for a stranger', () => {
    const project = makeProject({ members: [makeMember(MEMBER_ID)] });
    expect(userHasProjectAccess(project, STRANGER_ID)).toBe(false);
  });

  it('returns false when members array is empty', () => {
    expect(userHasProjectAccess(makeProject(), MEMBER_ID)).toBe(false);
  });

  it('guards against null entries in members array', () => {
    const project = makeProject({ members: [null, makeMember(MEMBER_ID)] });
    expect(userHasProjectAccess(project, MEMBER_ID)).toBe(true);
  });
});

describe('userIsProjectOwner', () => {
  it('returns false when project is null', () => {
    expect(userIsProjectOwner(null, OWNER_ID)).toBe(false);
  });

  it('returns true for the owner (string ownerId)', () => {
    expect(userIsProjectOwner(makeProject(), OWNER_ID)).toBe(true);
  });

  it('returns true for the owner (populated ownerId._id)', () => {
    expect(userIsProjectOwner(makePopulatedProject(), OWNER_ID)).toBe(true);
  });

  it('returns false for a member who is not the owner', () => {
    const project = makeProject({ members: [makeMember(MEMBER_ID)] });
    expect(userIsProjectOwner(project, MEMBER_ID)).toBe(false);
  });

  it('returns false for a stranger', () => {
    expect(userIsProjectOwner(makeProject(), STRANGER_ID)).toBe(false);
  });
});

describe('userIsProjectMember', () => {
  it('returns false when project is null', () => {
    expect(userIsProjectMember(null, MEMBER_ID)).toBe(false);
  });

  it('returns true for a member who is not the owner', () => {
    const project = makeProject({ members: [makeMember(MEMBER_ID)] });
    expect(userIsProjectMember(project, MEMBER_ID)).toBe(true);
  });

  it('returns false for the owner (owner is not a "member")', () => {
    expect(userIsProjectMember(makeProject(), OWNER_ID)).toBe(false);
  });

  it('returns false for a user with no access', () => {
    expect(userIsProjectMember(makeProject(), STRANGER_ID)).toBe(false);
  });
});
