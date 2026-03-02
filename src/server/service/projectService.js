import {
  findProjects,
  findProject,
  insertProject,
  findProjectByCode as findWithCode,
  addMemberToProject,
  removeMemberFromProject,
  updateProjectById,
  deleteProjectById,
} from '../repository/projectRepository.js';
import { userIsProjectOwner, userIsProjectMember } from '../utils/authUtils.js';
import { generateUniqueJoinCode } from '../utils/projectUtils.js';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_COLUMNS_TEMPLATE } from '../helpers/defaultColumns.js';

export async function listProjectsForUser(userId) {
  const projects = await findProjects(userId);
  return projects.map((project) => {
    const projectObj = project.toObject();
    if (userIsProjectOwner(project, userId)) {
      return projectObj;
    } else {
      // filter joinCode for non project members
      const { joinCode, ...rest } = projectObj;
      return rest;
    }
  });
}

export async function findProjectById(projectId) {
  return await findProject(projectId);
}

export async function findProjectByCode(joinCode) {
  return await findWithCode(joinCode);
}

export async function createProjectWithProjectData(
  userId,
  name,
  description,
  columns,
) {
  const joinCode = await generateUniqueJoinCode();
  const projectData = {
    ownerId: userId,
    name,
    description,
    columns:
      columns ||
      // copy all the properties of each column can generate a unique id
      DEFAULT_COLUMNS_TEMPLATE.map((col) => ({ ...col, id: uuidv4() })),
    joinCode,
    members: [],
  };
  return await insertProject(projectData);
}
export async function updateProjectSettings(projectId, updates) {
  const updateFields = {};
  if (updates.name !== undefined) updateFields.name = updates.name;
  if (updates.description !== undefined)
    updateFields.description = updates.description;
  if (updates.columns !== undefined) updateFields.columns = updates.columns;

  return await updateProjectById(projectId, updateFields);
}

export async function deleteUserProject(projectId) {
  return await deleteProjectById(projectId);
}

export async function joinProject(userId, joinCode) {
  // use outcome mapping to ensure service is HTTP agnostic
  const project = await findWithCode(joinCode);
  if (!project) {
    return { outcome: 'not_found' };
  }
  if (userIsProjectOwner(project, userId)) {
    return { outcome: 'is_owner' };
  }
  if (userIsProjectMember(project, userId)) {
    const populated = await findProject(project._id);
    return { outcome: 'already_member', project: populated };
  }
  const updatedProject = await addMemberToProject(project._id, userId);
  return { outcome: 'joined', project: updatedProject };
}

export async function removeProjectMember(
  projectId,
  requestingUserId,
  memberId,
) {
  const project = await findProject(projectId);
  if (!project) {
    return { outcome: 'not_found' };
  }

  if (!userIsProjectOwner(project, requestingUserId)) {
    return { outcome: 'forbidden' };
  }

  if (memberId === requestingUserId) {
    return { outcome: 'owner_self_removal' };
  }

  if (!userIsProjectMember(project, memberId)) {
    return { outcome: 'member_not_found' };
  }

  const updatedProject = await removeMemberFromProject(projectId, memberId);
  return { outcome: 'removed', project: updatedProject };
}
