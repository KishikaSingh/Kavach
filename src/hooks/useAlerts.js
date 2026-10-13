// TEMP stub (Person 1) — Person 3 replaces with the real hook.
import { useCallback } from 'react';
import { createStore, useStore } from './tempStore';
import { mockAlerts } from './tempMock';

const store = createStore(mockAlerts);

export default function useAlerts() {
  const alerts = useStore(store);

  const refresh = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 400));
  }, []);

  // Only the explicit resolve action changes status; viewing an alert never does.
  const resolveAlert = useCallback(async (id) => {
    store.set((list) => list.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)));
  }, []);

  return { alerts, loading: false, error: null, refresh, resolveAlert };
}
