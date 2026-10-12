import { DATA_SOURCE } from '../config.js';
import { ServiceError } from './serviceError.js';

// PHASE 3 HOOK-UP POINT.
// In live mode every service calls the backend returned here. Person 2 owns
// firebaseService.js; once it exists, return it from getLiveBackend():
//
//   import * as firebaseService from './firebaseService.js';
//   export function getLiveBackend() { return firebaseService; }
//
// The backend must provide these functions (same names the services use):
//   subscribeDevice(onData, onError) -> unsubscribe        refreshDevice() -> Promise
//   subscribeApp(onData, onError)    -> unsubscribe        (backendReachable status)
//   subscribeAlerts(onData, onError) -> unsubscribe        resolveAlert(id) -> Promise
//   subscribeContacts(onData, onError) -> unsubscribe
//   addContact(c), updateContact(id, patch), deleteContact(id), setPrimary(id) -> Promise
//   subscribeNotifications(onData, onError) -> unsubscribe
//   markRead(id), markAllRead(), clearAll() -> Promise
//   subscribeSettings(onData, onError) -> unsubscribe      updateSettings(patch) -> Promise
//
// Until then this returns null and live mode reports a clear error instead of
// silently falling back to fake data.
export function getLiveBackend() {
  return null;
}

// Returns the live backend, or null in demo mode. Throws in live mode if not connected.
export function liveBackend() {
  if (DATA_SOURCE !== 'live') return null;
  const backend = getLiveBackend();
  if (!backend) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      'Live mode is on but the Firebase backend is not connected yet.'
    );
  }
  return backend;
}
