// TEMP stub (Person 1) — Person 3 replaces with the real hook.
import { useCallback } from 'react';
import { createStore, useStore } from './tempStore';
import { mockNotifications } from './tempMock';

const store = createStore(mockNotifications);

export default function useNotifications() {
  const notifications = useStore(store);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (id) => {
    store.set((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const markAllRead = useCallback(async () => {
    store.set((list) => list.map((n) => ({ ...n, read: true })));
  }, []);
  const clearAll = useCallback(async () => {
    store.set([]);
  }, []);

  return { notifications, unreadCount, loading: false, error: null, markRead, markAllRead, clearAll };
}
