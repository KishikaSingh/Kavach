import { demoStore } from './demoStore.js';
import { liveBackend } from './liveAdapter.js';

// Subscribe to one slice of data from the active source (demo store or live backend).
// Returns an unsubscribe function. Errors are reported through onError, never thrown.
export function subscribeSlice(key, liveFnName, onData, onError) {
  try {
    const backend = liveBackend();
    if (backend) return backend[liveFnName](onData, onError);
    return demoStore.subscribe(key, onData);
  } catch (error) {
    if (onError) onError(error);
    return () => {};
  }
}

// Run a write action on the active source. In demo mode `demoAction` runs against
// the in-memory store; in live mode the backend function of the same name runs.
export async function runAction(liveFnName, liveArgs, demoAction) {
  const backend = liveBackend();
  if (backend) return backend[liveFnName](...liveArgs);
  await demoStore.delay(150);
  return demoAction();
}
