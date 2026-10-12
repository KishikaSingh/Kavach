import { useMemo } from 'react';
import {
  clearAll, markAllRead, markRead, subscribeNotifications,
} from '../services/inboxService.js';
import { useSubscription } from './useSubscription.js';

// useNotifications() -> { notifications, unreadCount, loading, error, markRead, markAllRead, clearAll }
// notifications: newest first. clearAll() empties the local history; confirm in the UI first.
export function useNotifications() {
  const { data, loading, error, retry } = useSubscription(subscribeNotifications);

  const notifications = useMemo(
    () => [...(data || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [data]
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return { notifications, unreadCount, loading, error, retry, markRead, markAllRead, clearAll };
}
