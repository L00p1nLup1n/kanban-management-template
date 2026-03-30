import Notification from '../models/Notification.js';

export async function createNotification(data) {
  return await Notification.create(data);
}

export async function findNotificationsForUser(
  userId,
  { limit = 20, offset = 0, unreadOnly = false } = {},
) {
  const filter = { recipientId: userId };
  if (unreadOnly) filter.isRead = false;

  return await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
}

export async function countUnreadForUser(userId) {
  return await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
  });
}

export async function findNotificationById(notificationId) {
  return await Notification.findById(notificationId);
}

export async function markAsRead(notificationId, userId) {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { $set: { isRead: true } },
    { new: true },
  );
}

export async function markAllAsRead(userId) {
  return await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } },
  );
}

export async function deleteNotification(notificationId, userId) {
  return await Notification.findOneAndDelete({
    _id: notificationId,
    recipientId: userId,
  });
}

export async function deleteNotificationsByMetadata(filter) {
  return await Notification.deleteMany(filter);
}
