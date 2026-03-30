import { asyncHandler } from '../helpers/asyncWrapper.js';
import { ProjectError } from '../errors/error.js';
import * as notificationService from '../service/notificationService.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = await notificationService.getNotificationsForUser(userId, {
    limit,
    offset,
    unreadOnly,
  });

  res.json(result);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.userId);
  res.json({ count });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const result = await notificationService.markNotificationRead(
    notificationId,
    req.userId,
  );

  if (result.outcome === 'not_found') {
    throw new ProjectError(404, 'Notification not found');
  }

  res.json(result.notification);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllNotificationsRead(req.userId);
  res.json({ message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const result = await notificationService.deleteUserNotification(
    notificationId,
    req.userId,
  );

  if (result.outcome === 'not_found') {
    throw new ProjectError(404, 'Notification not found');
  }

  res.json({ message: 'Notification deleted' });
});
