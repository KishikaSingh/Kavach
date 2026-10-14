import { demoStore } from './demoStore.js';
import { ServiceError } from './serviceError.js';
import { subscribeSlice, runAction } from './serviceUtils.js';

export function subscribeAlerts(onData, onError) {
  return subscribeSlice('alerts', 'subscribeAlerts', onData, onError);
}

// Marks an alert as resolved. Only ever called from an explicit user action
// ("Mark as resolved"): viewing an alert must never resolve it.
export function resolveAlert(id) {
  return runAction('resolveAlert', [id], () => {
    const alerts = demoStore.get('alerts');
    const alert = alerts.find((a) => a.id === id);
    if (!alert) throw new ServiceError('NOT_FOUND', 'Alert not found.');
    if (alert.status === 'resolved') return;

    alert.status = 'resolved';
    demoStore.set('alerts', alerts);

    // Clear the device's alert state once no active alert is left.
    if (!alerts.some((a) => a.status === 'new')) {
      const device = demoStore.get('device');
      if (device.accidentStatus === 'alert') {
        device.accidentStatus = 'normal';
        demoStore.set('device', device);
      }
    }

    const notifications = demoStore.get('notifications');
    notifications.unshift({
      id: `n${Date.now()}`,
      type: 'alertUpdate',
      title: 'Alert resolved',
      body: 'You marked an accident alert as resolved.',
      timestamp: new Date().toISOString(),
      read: false,
    });
    demoStore.set('notifications', notifications);
  });
}

export async function refreshAlerts() {
  await demoStore.delay(400);
}
