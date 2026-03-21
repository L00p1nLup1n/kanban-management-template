import Project from '../models/Project.js';

export async function findProjects(userId) {
  return await Project.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  })
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email role');
}

export async function findProject(projectId) {
  return await Project.findById(projectId)
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email role');
}

export async function findProjectByCode(joinCode) {
  return await Project.findOne({ joinCode });
}

export async function findProjectsByCodes(codes) {
  return await Project.find({ joinCode: { $in: codes } }).select('joinCode');
}

export async function insertProject(projectData) {
  return await Project.create(projectData);
}

export async function updateProjectById(projectId, updateFields) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $set: updateFields },
    { new: true, runValidators: true },
  )
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email role');
}

export async function deleteProjectById(projectId) {
  return await Project.findByIdAndDelete(projectId);
}

export async function addMemberToProject(projectId, userId, role) {
  return await Project.findByIdAndUpdate(
    projectId,
    {
      $addToSet: {
        members: { userId, role, joinedAt: new Date() },
      },
    },
    { new: true },
  )
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email role');
}

export async function removeMemberFromProject(projectId, memberId) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $pull: { members: { userId: memberId } } },
    { new: true },
  )
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email role');
}
