// TEMP stub (Person 1) — Person 3 replaces with the real hook.
import { useCallback } from 'react';
import { createStore, useStore } from './tempStore';
import { mockSettings } from './tempMock';

const store = createStore(mockSettings);

export default function useSettings() {
  const settings = useStore(store);

  // Accepts a partial patch; the notifications object is merged, not replaced.
  const updateSettings = useCallback(async (patch) => {
    store.set((s) => ({
      ...s,
      ...patch,
      notifications: { ...s.notifications, ...(patch.notifications || {}) },
    }));
  }, []);

  return { settings, loading: false, error: null, updateSettings };
}
