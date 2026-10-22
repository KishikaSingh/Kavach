import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAlertConfidence,
  dispatchEmergencyNotification,
  formatEmergencyLocation,
  formatEmergencyMessage,
  getEmergencyConfidenceThreshold,
  getEmergencyDispatch,
  resetEmergencyDispatchesForTesting,
  retryEmergencyNotification,
  setEmergencyConfidenceThreshold,
  startEmergencyNotificationWatcher,
  stopEmergencyNotificationWatcher,
  subscribeEmergencyDispatch,
  validateEmergencyContacts,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from '../src/services/emergencyNotificationService.js';
import { demoStore } from '../src/services/demoStore.js';

test('confidence calculation maps severity and explicit confidence', () => {
  assert.equal(computeAlertConfidence(null), 0);
  assert.equal(computeAlertConfidence({ severity: 'high' }), 0.95);
  assert.equal(computeAlertConfidence({ severity: 'medium' }), 0.75);
  assert.equal(computeAlertConfidence({ severity: 'low' }), 0.35);
  assert.equal(computeAlertConfidence({ severity: 'unknown' }), 0.5);
  assert.equal(computeAlertConfidence({ confidence: 0.88, severity: 'low' }), 0.88);
  assert.equal(computeAlertConfidence({ confidence: 1.5 }), 1.0);
  assert.equal(computeAlertConfidence({ confidence: -0.2 }), 0);
});

test('configurable confidence threshold', () => {
  resetEmergencyDispatchesForTesting();
  assert.equal(getEmergencyConfidenceThreshold(), DEFAULT_CONFIDENCE_THRESHOLD);
  setEmergencyConfidenceThreshold(0.8);
  assert.equal(getEmergencyConfidenceThreshold(), 0.8);
  // Invalid values ignored
  setEmergencyConfidenceThreshold(1.5);
  assert.equal(getEmergencyConfidenceThreshold(), 0.8);
  setEmergencyConfidenceThreshold('invalid');
  assert.equal(getEmergencyConfidenceThreshold(), 0.8);
  resetEmergencyDispatchesForTesting();
});

test('threshold filters low-confidence accidents from alerting contacts', async () => {
  resetEmergencyDispatchesForTesting();
  const contacts = [{ id: 'c1', name: 'Mom', phone: '+919999900001', isPrimary: true }];

  // Low severity (confidence 0.35) should NOT trigger when threshold is 0.6
  const lowAlert = { id: 'alert_low_1', severity: 'low', timestamp: new Date().toISOString() };
  const lowResult = await dispatchEmergencyNotification(lowAlert, { contacts });
  assert.equal(lowResult.status, 'below_threshold');
  assert.equal(lowResult.confidence, 0.35);

  // Medium severity (confidence 0.75) SHOULD trigger
  const medAlert = { id: 'alert_med_1', severity: 'medium', timestamp: new Date().toISOString() };
  const medResult = await dispatchEmergencyNotification(medAlert, { contacts, isDemo: true });
  assert.equal(medResult.status, 'demo_sent');
});

test('location formatting: valid GPS creates Google Maps link; invalid GPS degrades gracefully', () => {
  const validAlert = { gpsValid: true, latitude: 28.6692, longitude: 77.4538 };
  const validLoc = formatEmergencyLocation(validAlert);
  assert.equal(validLoc.hasLocation, true);
  assert.ok(validLoc.mapsUrl.includes('28.6692'));
  assert.ok(validLoc.mapsUrl.includes('77.4538'));
  assert.ok(validLoc.text.includes('https://www.google.com/maps'));

  const invalidAlert = { gpsValid: false, latitude: null, longitude: null };
  const invalidLoc = formatEmergencyLocation(invalidAlert);
  assert.equal(invalidLoc.hasLocation, false);
  assert.equal(invalidLoc.mapsUrl, null);
  assert.equal(invalidLoc.text, 'Location: Unavailable (No GPS fix)');
});

test('message formatting: includes user name, detection time, and location', () => {
  const alert = {
    id: 'a1',
    timestamp: '2026-10-22T10:30:00.000Z',
    severity: 'high',
    gpsValid: true,
    latitude: 28.6692,
    longitude: 77.4538,
  };
  const msg = formatEmergencyMessage({ alert, userName: 'Aarav Sharma' });
  assert.ok(msg.includes('Aarav Sharma'));
  assert.ok(msg.includes('EMERGENCY ALERT'));
  assert.ok(msg.includes('https://www.google.com/maps'));
});

test('contact validation: validates international phone format, sorts primary first, flags invalid', () => {
  const rawContacts = [
    { id: 'c1', name: 'Friend', phone: '+91 99999 00002', isPrimary: false },
    { id: 'c2', name: 'Primary Guardian', phone: '+919999900001', isPrimary: true },
    { id: 'c3', name: 'Invalid Contact', phone: '123' },
  ];
  const { valid, invalid } = validateEmergencyContacts(rawContacts);
  assert.equal(valid.length, 2);
  assert.equal(valid[0].name, 'Primary Guardian');
  assert.equal(valid[0].isPrimary, true);
  assert.equal(valid[0].phone, '+919999900001');
  assert.equal(valid[1].phone, '+919999900002');
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].contact.name, 'Invalid Contact');
});

test('handles missing or empty contacts safely', async () => {
  resetEmergencyDispatchesForTesting();
  const alert = { id: 'a_empty_contacts', severity: 'high', timestamp: new Date().toISOString() };
  const res = await dispatchEmergencyNotification(alert, { contacts: [] });
  assert.equal(res.status, 'no_contacts');
  assert.equal(res.recipients.length, 0);
});

test('duplicate suppression: suppresses repeated notifications for same incident unless forceRetry', async () => {
  resetEmergencyDispatchesForTesting();
  const contacts = [{ id: 'c1', name: 'Dad', phone: '+919999900001', isPrimary: true }];
  const alert = { id: 'alert_dup_1', severity: 'high', timestamp: new Date().toISOString() };

  // First dispatch succeeds in demo mode
  const first = await dispatchEmergencyNotification(alert, { contacts, isDemo: true });
  assert.equal(first.status, 'demo_sent');
  assert.equal(first.duplicateSuppressed, undefined);

  // Second dispatch for identical alert is suppressed
  const second = await dispatchEmergencyNotification(alert, { contacts, isDemo: true });
  assert.equal(second.duplicateSuppressed, true);
  assert.equal(second.status, 'demo_sent');

  // Retry with forceRetry dispatches again
  const retried = await retryEmergencyNotification(alert, { contacts, isDemo: true });
  assert.equal(retried.status, 'demo_sent');
  assert.equal(retried.duplicateSuppressed, undefined);
});

test('unconfigured live gateway: reports unconfigured without claiming sent', async () => {
  resetEmergencyDispatchesForTesting();
  const contacts = [{ id: 'c1', name: 'Sister', phone: '+919999900001', isPrimary: true }];
  const alert = { id: 'alert_unconf_1', severity: 'high', timestamp: new Date().toISOString() };

  // In live mode without gatewayUrl set
  const originalSource = process.env.EXPO_PUBLIC_DATA_SOURCE;
  process.env.EXPO_PUBLIC_DATA_SOURCE = 'live';

  try {
    const res = await dispatchEmergencyNotification(alert, { contacts, isDemo: false, gatewayUrl: null });
    assert.equal(res.status, 'unconfigured');
    assert.ok(res.reason.includes('not configured'));
    assert.ok(res.fallbackUrl.startsWith('sms:+919999900001'));
  } finally {
    process.env.EXPO_PUBLIC_DATA_SOURCE = originalSource;
  }
});

test('gateway dispatch: handles successful HTTP delivery and failure recovery', async () => {
  resetEmergencyDispatchesForTesting();
  const contacts = [{ id: 'c1', name: 'Partner', phone: '+919999900001', isPrimary: true }];
  const alert = { id: 'alert_gw_1', severity: 'high', timestamp: new Date().toISOString() };

  // Mock global fetch for success
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
  });

  try {
    const res = await dispatchEmergencyNotification(alert, {
      contacts,
      gatewayUrl: 'https://sms-gateway.example.com/api/send',
      apiKey: 'test-key',
    });
    assert.equal(res.status, 'sent');
    assert.equal(res.channel, 'gateway');
    assert.equal(res.recipients.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Failure recovery
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    text: async () => 'Service Unavailable',
  });

  try {
    const failedAlert = { id: 'alert_gw_fail', severity: 'high', timestamp: new Date().toISOString() };
    const failRes = await dispatchEmergencyNotification(failedAlert, {
      contacts,
      gatewayUrl: 'https://sms-gateway.example.com/api/send',
    });
    assert.equal(failRes.status, 'failed');
    assert.ok(failRes.error.includes('503'));

    // Retry after error
    globalThis.fetch = async () => ({ ok: true, status: 200 });
    const retryRes = await retryEmergencyNotification(failedAlert, {
      contacts,
      gatewayUrl: 'https://sms-gateway.example.com/api/send',
    });
    assert.equal(retryRes.status, 'sent');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('records incident in in-app notification store', async () => {
  resetEmergencyDispatchesForTesting();
  demoStore.reset();
  const initialCount = demoStore.get('notifications').length;

  const contacts = [{ id: 'c1', name: 'Brother', phone: '+919999900001', isPrimary: true }];
  const alert = { id: 'alert_inbox_1', severity: 'high', timestamp: new Date().toISOString() };

  await dispatchEmergencyNotification(alert, { contacts, isDemo: true });

  const notifications = demoStore.get('notifications');
  assert.equal(notifications.length, initialCount + 1);
  const newest = notifications[0];
  assert.equal(newest.type, 'alertUpdate');
  assert.ok(newest.title.includes('Emergency contacts'));
  assert.equal(newest.alertId, 'alert_inbox_1');
});

test('subscription reactivity: emits updates when dispatch completes', async () => {
  resetEmergencyDispatchesForTesting();
  const alertId = 'alert_sub_1';
  const emitted = [];

  const unsub = subscribeEmergencyDispatch(alertId, (rec) => {
    emitted.push(rec);
  });

  const contacts = [{ id: 'c1', name: 'Doc', phone: '+919999900001', isPrimary: true }];
  await dispatchEmergencyNotification(
    { id: alertId, severity: 'high', timestamp: new Date().toISOString() },
    { contacts, isDemo: true }
  );

  assert.ok(emitted.length >= 1);
  const latest = emitted[emitted.length - 1];
  assert.equal(latest.status, 'demo_sent');
  assert.equal(getEmergencyDispatch(alertId).status, 'demo_sent');

  unsub();
});
