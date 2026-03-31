import * as invitationRepository from '../repository/invitationRepository.js';
import { addMemberToProject } from '../repository/projectRepository.js';
import {
  findByEmail,
  findById as findUserById,
} from '../repository/userRepository.js';
import { findProject } from '../repository/projectRepository.js';
import { createAndDeliverNotification } from './notificationService.js';
import {
  userIsProjectOwner,
  userHasProjectAccess,
} from '../utils/authUtils.js';
import { getIO } from '../socket.js';

const INVITATION_TTL_DAYS = 7;

function getInvitationExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + INVITATION_TTL_DAYS);
  return date;
}

export async function sendInvitation(
  senderId,
  projectId,
  recipientEmail,
  message,
) {
  const project = await findProject(projectId);
  if (!project) return { outcome: 'project_not_found' };

  if (!userIsProjectOwner(project, senderId)) {
    return { outcome: 'forbidden' };
  }

  const recipient = await findByEmail(recipientEmail);
  if (!recipient) return { outcome: 'user_not_found' };

  const recipientId = String(recipient._id);

  if (userHasProjectAccess(project, recipientId)) {
    return { outcome: 'already_member' };
  }

  const existing = await invitationRepository.findPendingInvitation(
    projectId,
    recipientId,
  );
  if (existing) return { outcome: 'already_invited' };

  const expiresAt = getInvitationExpiry();
  const invitation = await invitationRepository.createInvitation({
    projectId,
    senderId,
    recipientId,
    message,
    expiresAt,
  });

  const sender = await findUserById(senderId);
  const senderName = sender?.name || sender?.email || 'Someone';

  await createAndDeliverNotification({
    recipientId,
    type: 'invitation',
    title: `${senderName} invited you to join "${project.name}"`,
    message: message || undefined,
    metadata: {
      invitationId: String(invitation._id),
      projectId: String(project._id),
      projectName: project.name,
      senderId,
      senderName,
    },
    actionUrl: `/projects/${project._id}`,
    expiresAt,
  });

  try {
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('user:invitation-received', {
        invitationId: String(invitation._id),
        projectName: project.name,
        senderName,
      });
    }
  } catch (e) {
    console.warn('Socket emit error (sendInvitation):', e);
  }

  return { outcome: 'sent', invitation };
}

export async function respondToInvitation(userId, invitationId, accept) {
  const invitation = await invitationRepository.findInvitationById(
    invitationId,
  );
  if (!invitation) return { outcome: 'not_found' };

  const recipientId = invitation.recipientId._id || invitation.recipientId;
  if (String(recipientId) !== String(userId)) {
    return { outcome: 'forbidden' };
  }

  if (invitation.status !== 'pending') {
    return { outcome: 'already_responded' };
  }

  if (accept) {
    await invitationRepository.updateInvitationStatus(invitationId, 'accepted');

    const projectId = invitation.projectId._id || invitation.projectId;
    const acceptingUser = await findUserById(userId);
    const memberRole = acceptingUser?.role || 'developer';
    const project = await addMemberToProject(projectId, userId, memberRole);

    const recipientName =
      acceptingUser?.name || acceptingUser?.email || 'Someone';
    const projectName = invitation.projectId?.name || 'the project';
    const senderId = invitation.senderId._id || invitation.senderId;

    // Notify sender that invitation was accepted
    await createAndDeliverNotification({
      recipientId: senderId,
      type: 'general',
      title: `${recipientName} accepted your invitation to "${projectName}"`,
      metadata: { projectId: String(projectId), memberId: userId },
      actionUrl: `/projects/${projectId}`,
    });

    // Socket: notify project room and the new member
    try {
      const io = getIO();
      if (io) {
        const newMemberEntry = project?.members?.find((m) => {
          const mId = m.userId._id || m.userId;
          return String(mId) === String(userId);
        });
        io.to(String(projectId)).emit('project:member-joined', {
          projectId: String(projectId),
          memberId: userId,
          member: newMemberEntry,
          role: invitation.role,
        });
        io.to(`user:${userId}`).emit('user:joined-project', {
          project,
          projectId: String(projectId),
          projectName,
        });
        io.to(`user:${senderId}`).emit('user:invitation-response', {
          invitationId,
          accepted: true,
          recipientName,
        });
      }
    } catch (e) {
      console.warn('Socket emit error (respondToInvitation accept):', e);
    }

    return { outcome: 'accepted', project };
  } else {
    await invitationRepository.updateInvitationStatus(invitationId, 'declined');

    const recipient = await findUserById(userId);
    const recipientName = recipient?.name || recipient?.email || 'Someone';
    const projectName = invitation.projectId?.name || 'the project';
    const senderId = invitation.senderId._id || invitation.senderId;

    await createAndDeliverNotification({
      recipientId: senderId,
      type: 'general',
      title: `${recipientName} declined your invitation to "${projectName}"`,
      metadata: {
        projectId: String(invitation.projectId._id || invitation.projectId),
      },
    });

    try {
      const io = getIO();
      if (io) {
        io.to(`user:${senderId}`).emit('user:invitation-response', {
          invitationId,
          accepted: false,
          recipientName,
        });
      }
    } catch (e) {
      console.warn('Socket emit error (respondToInvitation decline):', e);
    }

    return { outcome: 'declined' };
  }
}

export async function cancelInvitation(senderId, invitationId) {
  const invitation = await invitationRepository.findInvitationById(
    invitationId,
  );
  if (!invitation) return { outcome: 'not_found' };

  const invSenderId = invitation.senderId._id || invitation.senderId;
  if (String(invSenderId) !== String(senderId)) {
    return { outcome: 'forbidden' };
  }

  if (invitation.status !== 'pending') {
    return { outcome: 'not_pending' };
  }

  await invitationRepository.updateInvitationStatus(invitationId, 'cancelled');
  return { outcome: 'cancelled' };
}

export async function getPendingInvitationsForUser(userId) {
  return await invitationRepository.findInvitationsForUser(userId, {
    status: 'pending',
  });
}

export async function getInvitationsForProject(projectId, requesterId) {
  const project = await findProject(projectId);
  if (!project) return { outcome: 'project_not_found' };
  if (!userIsProjectOwner(project, requesterId))
    return { outcome: 'forbidden' };

  const invitations = await invitationRepository.findInvitationsForProject(
    projectId,
  );
  return { outcome: 'ok', invitations };
}
