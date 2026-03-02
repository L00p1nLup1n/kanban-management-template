import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../repository/projectRepository.js', () => ({
  findProjects: vi.fn(),
  findProject: vi.fn(),
  insertProject: vi.fn(),
  findProjectByCode: vi.fn(),
  addMemberToProject: vi.fn(),
  removeMemberFromProject: vi.fn(),
  updateProjectById: vi.fn(),
  deleteProjectById: vi.fn(),
}));

vi.mock('../../utils/projectUtils.js', () => ({
  generateUniqueJoinCode: vi.fn().mockResolvedValue('newcode'),
}));

import * as repo from '../../repository/projectRepository.js';
import {
  listProjectsForUser,
  joinProject,
  removeProjectMember,
} from '../../service/projectService.js';
import {
  makeProject,
  OWNER_ID,
  MEMBER_ID,
  STRANGER_ID,
  PROJECT_ID,
} from '../helpers/factories.js';

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── listProjectsForUser ──────────────────────────────────────────────────────

describe('listProjectsForUser', () => {
  it('includes joinCode for the project owner', async () => {
    repo.findProjects.mockResolvedValue([makeProject()]);
    const result = await listProjectsForUser(OWNER_ID);
    expect(result[0]).toHaveProperty('joinCode');
  });

  it('strips joinCode for a non-owner member', async () => {
    repo.findProjects.mockResolvedValue([
      makeProject({ members: [MEMBER_ID] }),
    ]);
    const result = await listProjectsForUser(MEMBER_ID);
    expect(result[0]).not.toHaveProperty('joinCode');
  });

  it('handles a mixed list of owned and joined projects', async () => {
    repo.findProjects.mockResolvedValue([
      makeProject({ _id: 'p1', ownerId: OWNER_ID }),
      makeProject({ _id: 'p2', ownerId: STRANGER_ID, members: [OWNER_ID] }),
    ]);
    const result = await listProjectsForUser(OWNER_ID);
    expect(result[0]).toHaveProperty('joinCode'); // owned
    expect(result[1]).not.toHaveProperty('joinCode'); // joined
  });
});

// ─── joinProject ──────────────────────────────────────────────────────────────

describe('joinProject', () => {
  it('returns not_found when no project matches the joinCode', async () => {
    repo.findProjectByCode.mockResolvedValue(null);
    const result = await joinProject(STRANGER_ID, 'badcode');
    expect(result.outcome).toBe('not_found');
  });

  it('returns is_owner when the caller is the project owner', async () => {
    repo.findProjectByCode.mockResolvedValue(makeProject());
    const result = await joinProject(OWNER_ID, 'abc123');
    expect(result.outcome).toBe('is_owner');
  });

  it('returns already_member with populated project when caller is already a member', async () => {
    const project = makeProject({ members: [MEMBER_ID] });
    const populatedProject = makeProject({
      members: [{ _id: MEMBER_ID, name: 'Bob' }],
    });
    repo.findProjectByCode.mockResolvedValue(project);
    repo.findProject.mockResolvedValue(populatedProject);
    const result = await joinProject(MEMBER_ID, 'abc123');
    expect(result.outcome).toBe('already_member');
    expect(result.project).toBe(populatedProject);
  });

  it('calls addMemberToProject and returns joined for a new user', async () => {
    const project = makeProject();
    const updatedProject = makeProject({ members: [STRANGER_ID] });
    repo.findProjectByCode.mockResolvedValue(project);
    repo.addMemberToProject.mockResolvedValue(updatedProject);
    const result = await joinProject(STRANGER_ID, 'abc123');
    expect(repo.addMemberToProject).toHaveBeenCalledWith(
      PROJECT_ID,
      STRANGER_ID,
    );
    expect(result.outcome).toBe('joined');
    expect(result.project).toBe(updatedProject);
  });
});

// ─── removeProjectMember ──────────────────────────────────────────────────────

describe('removeProjectMember', () => {
  it('returns not_found when project does not exist', async () => {
    repo.findProject.mockResolvedValue(null);
    const result = await removeProjectMember(PROJECT_ID, OWNER_ID, MEMBER_ID);
    expect(result.outcome).toBe('not_found');
  });

  it('returns forbidden when requester is not the owner', async () => {
    repo.findProject.mockResolvedValue(makeProject());
    const result = await removeProjectMember(
      PROJECT_ID,
      MEMBER_ID,
      STRANGER_ID,
    );
    expect(result.outcome).toBe('forbidden');
  });

  it('returns owner_self_removal when owner tries to remove themselves', async () => {
    repo.findProject.mockResolvedValue(makeProject());
    const result = await removeProjectMember(PROJECT_ID, OWNER_ID, OWNER_ID);
    expect(result.outcome).toBe('owner_self_removal');
  });

  it('returns member_not_found when memberId is not in members list', async () => {
    repo.findProject.mockResolvedValue(makeProject()); // members: []
    const result = await removeProjectMember(PROJECT_ID, OWNER_ID, MEMBER_ID);
    expect(result.outcome).toBe('member_not_found');
  });

  it('calls removeMemberFromProject and returns removed on success', async () => {
    const project = makeProject({ members: [MEMBER_ID] });
    const updatedProject = makeProject();
    repo.findProject.mockResolvedValue(project);
    repo.removeMemberFromProject.mockResolvedValue(updatedProject);
    const result = await removeProjectMember(PROJECT_ID, OWNER_ID, MEMBER_ID);
    expect(repo.removeMemberFromProject).toHaveBeenCalledWith(
      PROJECT_ID,
      MEMBER_ID,
    );
    expect(result.outcome).toBe('removed');
    expect(result.project).toBe(updatedProject);
  });
});
