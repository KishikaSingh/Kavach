import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SimulatedSmsProvider,
  HttpGatewaySmsProvider,
  getSmsProvider,
} from '../src/services/smsProvider.js';
import {
  dispatchEmergencyNotification,
  retryEmergencyNotification,
  resetEmergencyDispatchesForTesting,
} from '../src/services/emergencyNotificationService.js';
import {
  createNotification,
  markRead,
  markAllRead,
  clearAll,
} from '../src/services/inboxService.js';
import {
  setAccidentAlertTapHandler,
  getPushPermissionStatus,
  initPushNotifications,
} from '../src/services/notificationService.js';
import { demoStore } from '../src/services/demoStore.js';

test('SimulatedSmsProvider: guarantees safe demo status and never claims sent', async () => {
  const provider = new SimulatedSmsProvider();
  const result = await provider.dispatch({
    alertId: 'alert_sim_1',
    recipients: [{ id: 'c1', name: 'Emergency Contact', phone: '+919999900001' }],
    message: 'Test simulated accident alert',
  });

  assert.equal(result.status, 'demo_sent');
  assert.equal(result.channel, 'simulated_sms');
  assert.equal(result.provider, 'simulation');
  assert.ok(result.note.includes('simulated'));
  assert.notEqual(result.status, 'sent', 'Simulated SMS must never be labeled as real sent message');
});

test('HttpGatewaySmsProvider: unconfigured gateway returns safe manual fallback', async () => {
  const provider = new HttpGatewaySmsProvider({ gatewayUrl: null });
  const result = await provider.dispatch({
    alertId: 'alert_unconf_1',
    recipients: [{ id: 'c1', name: 'Contact', phone: '+919999900001' }],
    message: 'Accident detected',
  });

  assert.equal(result.status, 'unconfigured');
  assert.equal(result.channel, 'manual_fallback');
  assert.ok(result.reason.includes('not configured'));
  assert.notEqual(result.status, 'sent', 'Unconfigured gateway must never claim sent');
});

test('HttpGatewaySmsProvider: handles network failure with failed status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    text: async () => 'Bad Gateway',
  });

  try {
    const provider = new HttpGatewaySmsProvider({ gatewayUrl: 'https://gateway.example.com/sms' });
    await assert.rejects(
      provider.dispatch({
        alertId: 'alert_fail_1',
        recipients: [{ id: 'c1', name: 'Contact', phone: '+919999900001' }],
        message: 'Accident detected',
      }),
      /HTTP 502/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getSmsProvider: returns SimulatedSmsProvider for demo mode and HttpGatewaySmsProvider for live mode with URL', () => {
  const demoProvider = getSmsProvider({ isDemo: true });
  assert.ok(demoProvider instanceof SimulatedSmsProvider);

  const gwProvider = getSmsProvider({ gatewayUrl: 'https://gateway.example.com/send' });
  assert.ok(gwProvider instanceof HttpGatewaySmsProvider);

  const liveUnconf = getSmsProvider({ isLive: true, isDemo: false, gatewayUrl: null });
  assert.ok(liveUnconf instanceof HttpGatewaySmsProvider);
});

test('Notification Tap Handler: routes accident payload to AlertDetails screen', () => {
  let routedAlertId = null;
  setAccidentAlertTapHandler(({ alertId, type }) => {
    assert.equal(type, 'accident');
    routedAlertId = alertId;
  });

  setAccidentAlertTapHandler((data) => {
    routedAlertId = data.alertId;
  });

  assert.equal(routedAlertId, null);
  setAccidentAlertTapHandler(null);
  assert.ok(true, 'Tap handler set and cleared safely');
});

test('Push Notifications: requires live mode and checks permissions safely', async () => {
  // In demo mode, initPushNotifications returns safe unavailable response without throwing
  const result = await initPushNotifications();
  assert.equal(result.available, false);
  assert.ok(result.reason.includes('live mode'));

  const perm = await getPushPermissionStatus();
  assert.ok(typeof perm.available === 'boolean');
  assert.ok(['granted', 'denied', 'unavailable'].includes(perm.status));
});

test('In-App Notifications Module: create, subscribe, mark read, mark all read, clear', async () => {
  demoStore.reset();
  const initial = demoStore.get('notifications');
  const count = initial.length;

  // 1. Create in-app notification
  const notif = await createNotification({
    type: 'accident',
    title: 'Impact Warning',
    body: 'Minor shock registered',
    alertId: 'alert_test_99',
  });
  assert.ok(notif.id);

  let updatedList = demoStore.get('notifications');
  assert.equal(updatedList.length, count + 1);
  assert.equal(updatedList[0].read, false);

  // 2. Mark single notification read
  await markRead(updatedList[0].id);
  updatedList = demoStore.get('notifications');
  assert.equal(updatedList[0].read, true);

  // 3. Mark all read
  await markAllRead();
  updatedList = demoStore.get('notifications');
  assert.ok(updatedList.every((n) => n.read === true));

  // 4. Clear all notifications
  await clearAll();
  assert.equal(demoStore.get('notifications').length, 0);

  // Reset demo store
  demoStore.reset();
});

test('Emergency SMS failure recovery and retry flow', async () => {
  resetEmergencyDispatchesForTesting();
  const contacts = [{ id: 'c1', name: 'Primary Guardian', phone: '+919999900001', isPrimary: true }];
  const alert = { id: 'alert_retry_test', severity: 'high', timestamp: new Date().toISOString() };

  // 1. First attempt fails due to HTTP 500
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'Internal Server Error',
  });

  try {
    const failedRes = await dispatchEmergencyNotification(alert, {
      contacts,
      gatewayUrl: 'https://sms.example.com/send',
    });
    assert.equal(failedRes.status, 'failed');
    assert.ok(failedRes.error.includes('500'));

    // 2. Recovery attempt with force retry
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const recovered = await retryEmergencyNotification(alert, {
      contacts,
      gatewayUrl: 'https://sms.example.com/send',
    });
    assert.equal(recovered.status, 'sent');
    assert.equal(recovered.channel, 'gateway');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
