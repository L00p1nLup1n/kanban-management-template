import { useState, useEffect, useCallback, useMemo } from 'react';
import { notificationsAPI, Notification } from '../api/client';
import { useAuth } from './useAuth';
import useUserSocket from './useUserSocket';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.list({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Socket handler for real-time notifications
  const socketHandlers = useMemo(
    () => ({
      'user:notification': (data: unknown) => {
        const { notification } = data as { notification: Notification };
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      },
    }),
    [],
  );

  useUserSocket(user?.id, socketHandlers);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationsAPI.markRead(notificationId);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        fetchNotifications();
      }
    },
    [fetchNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationsAPI.markAllRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((n) => n._id === notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await notificationsAPI.delete(notificationId);
      } catch (err) {
        console.error('Failed to delete notification:', err);
        fetchNotifications();
      }
    },
    [notifications, fetchNotifications],
  );

  const fetchMore = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.list({
        limit: 20,
        offset: notifications.length,
      });
      setNotifications((prev) => [...prev, ...data.notifications]);
    } catch (err) {
      console.error('Failed to fetch more notifications:', err);
    }
  }, [notifications.length]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchMore,
    refetch: fetchNotifications,
  };
}
