import Invitation from '../models/Invitation.js';

export async function createInvitation(data) {
  return await Invitation.create(data);
}

export async function findPendingInvitation(projectId, recipientId) {
  return await Invitation.findOne({
    projectId,
    recipientId,
    status: 'pending',
  });
}

export async function findInvitationById(invitationId) {
  return await Invitation.findById(invitationId)
    .populate('projectId', 'name ownerId members')
    .populate('senderId', 'name email')
    .populate('recipientId', 'name email');
}

export async function findInvitationsForUser(recipientId, { status } = {}) {
  const filter = { recipientId };
  if (status) filter.status = status;
  return await Invitation.find(filter)
    .populate('projectId', 'name')
    .populate('senderId', 'name email')
    .sort({ createdAt: -1 });
}

export async function findInvitationsForProject(projectId) {
  return await Invitation.find({ projectId })
    .populate('recipientId', 'name email')
    .sort({ createdAt: -1 });
}

export async function updateInvitationStatus(invitationId, status) {
  return await Invitation.findByIdAndUpdate(
    invitationId,
    { $set: { status } },
    { new: true },
  );
}
