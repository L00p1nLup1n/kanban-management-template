import * as notificationRepository from '../repository/notificationRepository.js';
import { getIO } from '../socket.js';

const DEFAULT_TTL_DAYS = 7;

function getDefaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + DEFAULT_TTL_DAYS);
  return date;
}

export async function createAndDeliverNotification({
  recipientId,
  type,
  title,
  message,
  metadata,
  actionUrl,
  expiresAt,
}) {
  const notification = await notificationRepository.createNotification({
    recipientId,
    type,
    title,
    message,
    metadata,
    actionUrl,
    expiresAt: expiresAt || getDefaultExpiry(),
  });

  try {
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('user:notification', { notification });
    }
  } catch (err) {
    console.error('Failed to emit notification via socket:', err);
  }

  return notification;
}

export async function getNotificationsForUser(userId, options = {}) {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findNotificationsForUser(userId, options),
    notificationRepository.countUnreadForUser(userId),
  ]);

  return { notifications, unreadCount };
}

export async function getUnreadCount(userId) {
  return await notificationRepository.countUnreadForUser(userId);
}

export async function markNotificationRead(notificationId, userId) {
  const notification = await notificationRepository.markAsRead(
    notificationId,
    userId,
  );
  if (!notification) {
    return { outcome: 'not_found' };
  }
  return { outcome: 'marked', notification };
}

export async function markAllNotificationsRead(userId) {
  await notificationRepository.markAllAsRead(userId);
  return { outcome: 'marked' };
}

export async function deleteUserNotification(notificationId, userId) {
  const notification = await notificationRepository.deleteNotification(
    notificationId,
    userId,
  );
  if (!notification) {
    return { outcome: 'not_found' };
  }
  return { outcome: 'deleted' };
}
