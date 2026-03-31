import { asyncHandler } from '../helpers/asyncWrapper.js';
import { ProjectError } from '../errors/error.js';
import {
  sendInvitation,
  respondToInvitation,
  cancelInvitation,
  getPendingInvitationsForUser,
  getInvitationsForProject,
} from '../service/invitationService.js';

export const inviteMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, message } = req.body;
  const senderId = req.userId;

  if (!email) throw new ProjectError(400, 'Recipient email required');

  const result = await sendInvitation(senderId, projectId, email, message);

  if (result.outcome === 'project_not_found')
    throw new ProjectError(404, 'Project not found');
  if (result.outcome === 'forbidden')
    throw new ProjectError(403, 'Only the project owner can invite members');
  if (result.outcome === 'user_not_found')
    throw new ProjectError(404, 'No user found with that email');
  if (result.outcome === 'already_member')
    throw new ProjectError(400, 'User is already a member of this project');
  if (result.outcome === 'already_invited')
    throw new ProjectError(400, 'User already has a pending invitation');

  return res.status(201).json({ invitation: result.invitation });
});

export const listPendingInvitations = asyncHandler(async (req, res) => {
  const invitations = await getPendingInvitationsForUser(req.userId);
  return res.json({ invitations });
});

export const listProjectInvitations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const result = await getInvitationsForProject(projectId, req.userId);

  if (result.outcome === 'project_not_found')
    throw new ProjectError(404, 'Project not found');
  if (result.outcome === 'forbidden')
    throw new ProjectError(403, 'Only the project owner can view invitations');

  return res.json({ invitations: result.invitations });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const result = await respondToInvitation(req.userId, invitationId, true);

  if (result.outcome === 'not_found')
    throw new ProjectError(404, 'Invitation not found');
  if (result.outcome === 'forbidden') throw new ProjectError(403, 'Forbidden');
  if (result.outcome === 'already_responded')
    throw new ProjectError(400, 'Invitation already responded to');

  return res.json({ project: result.project, message: 'Invitation accepted' });
});

export const declineInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const result = await respondToInvitation(req.userId, invitationId, false);

  if (result.outcome === 'not_found')
    throw new ProjectError(404, 'Invitation not found');
  if (result.outcome === 'forbidden') throw new ProjectError(403, 'Forbidden');
  if (result.outcome === 'already_responded')
    throw new ProjectError(400, 'Invitation already responded to');

  return res.json({ message: 'Invitation declined' });
});

export const deleteInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const result = await cancelInvitation(req.userId, invitationId);

  if (result.outcome === 'not_found')
    throw new ProjectError(404, 'Invitation not found');
  if (result.outcome === 'forbidden')
    throw new ProjectError(403, 'Only the sender can cancel an invitation');
  if (result.outcome === 'not_pending')
    throw new ProjectError(400, 'Only pending invitations can be cancelled');

  return res.json({ message: 'Invitation cancelled' });
});
