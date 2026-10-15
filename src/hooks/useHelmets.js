// TEMP stub (Person 1) - Person 3 replaces with the real hook.
// Lists the helmets the app can connect to and remembers which one is selected.
// The choice is saved on this phone (AsyncStorage) so it survives a restart.
// Real helmet scanning is not built yet: the list is demo data.
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore, useStore } from './tempStore';
import { mockHelmets } from './tempMock';

const STORAGE_KEY = 'smartHelmet.selectedHelmetId';

const store = createStore({
  helmets: mockHelmets,
  selectedId: mockHelmets.length > 0 ? mockHelmets[0].deviceId : null,
});

// Restore the saved choice once, when this module is first imported.
// Ignored if that helmet is no longer in the list.
AsyncStorage.getItem(STORAGE_KEY)
  .then((savedId) => {
    const state = store.get();
    const exists = state.helmets.some((h) => h.deviceId === savedId);
    if (savedId && exists) store.set({ ...state, selectedId: savedId });
  })
  .catch(() => {});

export default function useHelmets() {
  const { helmets, selectedId } = useStore(store);
  const selectedHelmet = helmets.find((h) => h.deviceId === selectedId) || null;

  // Choose which helmet the app shows. Unknown IDs are ignored.
  const selectHelmet = useCallback(async (deviceId) => {
    const state = store.get();
    if (!state.helmets.some((h) => h.deviceId === deviceId)) return false;
    store.set({ ...state, selectedId: deviceId });
    AsyncStorage.setItem(STORAGE_KEY, deviceId).catch(() => {});
    return true;
  }, []);

  // Demo "scan": waits a moment, then returns the same list.
  const refresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }, []);

  return {
    helmets,
    selectedId,
    selectedHelmet,
    selectHelmet,
    loading: false,
    error: null,
    refresh,
  };
}