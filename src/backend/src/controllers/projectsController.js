import { asyncHandler } from '../helpers/asyncWrapper.js';
import { ProjectError } from '../errors/error.js';
import {
  listProjectsForUser,
  findProjectById,
  findProjectByCode,
  createProjectWithProjectData,
  updateProjectSettings,
  deleteUserProject,
  joinProject,
  removeProjectMember,
} from '../service/projectService.js';
import {
  userHasProjectAccess,
  userIsProjectOwner,
} from '../utils/authUtils.js';
import { getIO } from '../socket.js';

export const listProjects = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const projects = await listProjectsForUser(userId);
  return res.json({ projects });
});

export const getProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  const project = await findProjectById(projectId);

  if (!project) {
    throw new ProjectError(404, 'Project not found');
  }

  // Allow owner or members to view
  if (!userHasProjectAccess(project, userId)) {
    throw new ProjectError(403, 'Forbidden');
  }

  return res.json({ project });
});

export const createProject = asyncHandler(async (req, res) => {
  const { name, description, columns } = req.body;
  const userId = req.userId;

  if (!name) {
    throw new ProjectError(400, 'Project name required');
  }

  const project = await createProjectWithProjectData(
    userId,
    name,
    description,
    columns,
  );

  return res.status(201).json({ project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, columns } = req.body;
  const userId = req.userId;

  const project = await findProjectById(projectId);
  if (!project) {
    throw new ProjectError(404, 'Project not found');
  }

  if (!userIsProjectOwner(project, userId)) {
    throw new ProjectError(
      403,
      'Only the project owner can modify project settings',
    );
  }

  const updatedProject = await updateProjectSettings(projectId, {
    name,
    description,
    columns,
  });

  // Socket emit for real-time sync
  try {
    const io = getIO();
    if (io)
      io.to(String(updatedProject._id)).emit('project:columns-updated', {
        projectId: String(updatedProject._id),
        columns: updatedProject.columns,
      });
  } catch (e) {
    console.warn('Socket emit error (updateProject):', e);
  }
  return res.json({ project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;
  const project = await findProjectById(projectId);

  if (!project) {
    throw new ProjectError(404, 'Project not found');
  }

  // Only owner can delete
  if (!userIsProjectOwner(project, userId)) {
    throw new ProjectError(403, 'Forbidden');
  }

  await deleteUserProject(projectId);

  return res.status(204).send();
});

export const joinProjectByCode = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { joinCode } = req.body;
  if (!joinCode) throw new ProjectError(400, 'Join code required');

  const result = await joinProject(userId, joinCode);
  if (result.outcome === 'not_found') {
    throw new ProjectError(404, 'Project not found');
  }
  if (result.outcome === 'is_owner') {
    throw new ProjectError(400, 'Owner is already part of the project');
  }
  if (result.outcome === 'already_member') {
    return res.json({ project: result.project, message: 'Already a member' });
  }
  // outcome === 'joined' — emit socket events
  const { project } = result;

  try {
    const io = getIO();
    if (io) {
      const newMember = project.members.find(
        (m) => m._id.toString() === userId,
      );
      io.to(String(project._id)).emit('project:member-joined', {
        projectId: String(project._id),
        memberId: userId,
        member: newMember,
      });
      io.to(`user:${userId}`).emit('user:joined-project', {
        project,
        projectId: String(project._id),
        projectName: project.name,
      });
    }
  } catch (e) {
    console.warn('Socket emit error (joinProjectByCode):', e);
  }
  return res.json({ project, message: 'Joined project' });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { projectId, memberId } = req.params;
  const userId = req.userId;

  const result = await removeProjectMember(projectId, userId, memberId);

  if (result.outcome === 'not_found') {
    throw new ProjectError(404, 'Project not found');
  }
  if (result.outcome === 'forbidden') {
    throw new ProjectError(403, 'Only the project owner can remove members');
  }
  if (result.outcome === 'owner_self_removal') {
    throw new ProjectError(400, 'Owner cannot be removed from the project');
  }
  if (result.outcome === 'member_not_found') {
    throw new ProjectError(404, 'Member not found in this project');
  }

  const { project } = result;

  // Emit socket events to notify about member removal
  try {
    const io = getIO();
    if (io) {
      io.to(String(project._id)).emit('project:member-removed', {
        projectId: String(project._id),
        memberId,
      });

      io.to(`user:${memberId}`).emit('user:removed-from-project', {
        projectId: String(project._id),
        projectName: project.name,
      });
    }
  } catch (e) {
    console.warn('Socket emit error (removeMember):', e);
  }

  return res.json({ project, message: 'Member removed successfully' });
});
