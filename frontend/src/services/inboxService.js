import { demoStore } from './demoStore.js';
import { subscribeSlice, runAction } from './serviceUtils.js';

// In-app notification centre (the list shown on the Notifications screen).
// Named inboxService so it does not clash with Person 2's notificationService.js,
// which handles push permission, tokens and tap handling.
// A notification here does not by itself prove a real hardware event: in demo
// mode these are simulated.

export function subscribeNotifications(onData, onError) {
  return subscribeSlice('notifications', 'subscribeNotifications', onData, onError);
}

export function markRead(id) {
  return runAction('markRead', [id], () => {
    const list = demoStore.get('notifications');
    demoStore.set('notifications', list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  });
}

export function markAllRead() {
  return runAction('markAllRead', [], () => {
    const list = demoStore.get('notifications');
    demoStore.set('notifications', list.map((n) => ({ ...n, read: true })));
  });
}

// Clears the local history. The UI must ask for confirmation first.
export function clearAll() {
  return runAction('clearAll', [], () => {
    demoStore.set('notifications', []);
  });
}
