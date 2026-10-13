// TEMP (Person 1): tiny shared store so the stub hooks behave like real shared state
// (e.g. the bell badge and the Notifications screen stay in sync). Person 3 replaces
// this whole folder with the real hooks; delete this file then.
import { useSyncExternalStore } from 'react';

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (next) => {
      state = typeof next === 'function' ? next(state) : next;
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get);
}
