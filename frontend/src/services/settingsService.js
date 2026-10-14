import { demoStore } from './demoStore.js';
import { ServiceError } from './serviceError.js';
import { subscribeSlice, runAction } from './serviceUtils.js';

// App/device preferences. Only settings that really work can be changed.
// The accident threshold is not configurable from the app yet (the firmware owns it),
// so changing it is rejected with code UNSUPPORTED and the UI shows "Unavailable".

export function subscribeSettings(onData, onError) {
  return subscribeSlice('settings', 'subscribeSettings', onData, onError);
}

export function updateSettings(patch) {
  if (patch && 'accidentThreshold' in patch) {
    return Promise.reject(
      new ServiceError('UNSUPPORTED', 'The accident detection threshold cannot be changed from the app yet.')
    );
  }
  return runAction('updateSettings', [patch], () => {
    const current = demoStore.get('settings');
    demoStore.set('settings', {
      ...current,
      notifications: { ...current.notifications, ...(patch?.notifications || {}) },
    });
  });
}
