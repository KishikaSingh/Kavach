import './helpers/supabase-live-env.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fakeSupabase from './fakes/supabase.js';
import { watch, sleep } from './helpers/collect.js';
import { getLiveBackend, resetLiveBackend } from '../src/services/liveAdapter.js';
import * as deviceSvc from '../src/services/deviceService.js';
import * as alertSvc from '../src/services/alertService.js';
import * as contactSvc from '../src/services/contactService.js';
import * as inboxSvc from '../src/services/inboxService.js';
import * as settingsSvc from '../src/services/settingsService.js';
import * as supabaseService from '../src/services/supabaseService.js';
import { deriveDevice } from '../src/utils/deviceStatus.js';

const UID = 'test-user-1';

beforeEach(() => {
  resetLiveBackend();
  fakeSupabase.__reset();
});

test('live mode uses supabaseService as default live backend when configured', () => {
  const backend = getLiveBackend();
  assert.equal(backend.DEVICE_ID, 'HELMET_001');
  for (const fn of [
    'subscribeDevice', 'subscribeApp', 'refreshDevice', 'subscribeAlerts', 'resolveAlert',
    'subscribeContacts', 'addContact', 'updateContact', 'deleteContact', 'setPrimary',
    'subscribeNotifications', 'markRead', 'markAllRead', 'clearAll', 'subscribeSettings', 'updateSettings',
  ]) {
    assert.equal(typeof backend[fn], 'function', `supabaseService.${fn}`);
  }
});

test('Supabase device: empty database gives no device, then follows helmet telemetry and location', async () => {
  const device = watch(deviceSvc.subscribeDevice);
  await sleep(15);
  assert.equal(device.state.value, null, 'empty database gives null, never fake data');

  // Insert helmet and telemetry
  fakeSupabase.__writeTable('helmets', { id: 'HELMET_001', name: 'Demo Helmet' });
  fakeSupabase.__writeTable('helmet_telemetry', {
    helmet_id: 'HELMET_001',
    battery_percentage: 85,
    helmet_status: 'connected',
    accident_status: 'normal',
    sensor_status: 'ok',
    gsm_status: 'connected',
    recorded_at: new Date().toISOString(),
  });
  fakeSupabase.__writeTable('helmet_locations', {
    helmet_id: 'HELMET_001',
    latitude: 12.9716,
    longitude: 77.5946,
    gps_valid: true,
    speed: 0.0,
    recorded_at: new Date().toISOString(),
  });

  // Trigger manual refresh
  const refreshed = await deviceSvc.refreshDevice();
  assert.equal(refreshed.batteryLevel, 85);
  assert.equal(refreshed.helmetStatus, 'connected');
  assert.equal(refreshed.accidentStatus, 'normal');
  assert.equal(refreshed.gpsValid, true);
  assert.equal(refreshed.latitude, 12.9716);
  assert.equal(refreshed.longitude, 77.5946);

  device.unsubscribe();
});

test('Supabase app info reports live and reachable', async () => {
  const app = watch(deviceSvc.subscribeApp);
  await sleep(15);
  assert.deepEqual(app.state.value, { dataSource: 'live', backendReachable: true });
  app.unsubscribe();
});

test('Supabase alerts: lists alerts for device and resolves safely', async () => {
  const alertRow = {
    id: 'ALERT_001',
    helmet_id: 'HELMET_001',
    timestamp: new Date().toISOString(),
    severity: 'high',
    latitude: 12.9716,
    longitude: 77.5946,
    gps_valid: true,
    status: 'new',
    sms_status: 'pending',
  };
  fakeSupabase.__writeTable('accident_alerts', alertRow);

  const alerts = watch(alertSvc.subscribeAlerts);
  await sleep(15);
  assert.ok(alerts.state.value, 'alerts value is defined');
  assert.equal(alerts.state.value.length, 1);
  assert.equal(alerts.state.value[0].id, 'ALERT_001');
  assert.equal(alerts.state.value[0].status, 'new');

  // Resolve alert
  await alertSvc.resolveAlert('ALERT_001');

  // Check alert updated in DB
  const storedAlert = fakeSupabase.tables.accident_alerts.find((a) => a.id === 'ALERT_001');
  assert.equal(storedAlert.status, 'resolved');

  // Check in-app notification recorded
  const inbox = fakeSupabase.tables.in_app_notifications;
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].title, 'Alert resolved');

  // Attempting to resolve missing alert throws NOT_FOUND
  await assert.rejects(alertSvc.resolveAlert('NON_EXISTENT'), { code: 'NOT_FOUND' });
  alerts.unsubscribe();
});

test('Supabase contacts: validation, primary assignment, updates, and deletion', async () => {
  const contacts = watch(contactSvc.subscribeContacts);
  await sleep(15);
  assert.ok(contacts.state.value, 'contacts value is defined');
  assert.equal(contacts.state.value.length, 0);

  // Validation
  await assert.rejects(contactSvc.addContact({ name: '', phone: '9876543210' }), { code: 'INVALID_NAME' });
  await assert.rejects(contactSvc.addContact({ name: 'Asha', phone: '123' }), { code: 'INVALID_PHONE' });

  // Add first contact (becomes primary)
  await contactSvc.addContact({ name: 'Asha', phone: '98765 43210' });
  await sleep(15);

  // Add second contact
  await contactSvc.addContact({ name: 'Ravi', phone: '91234 56789' });
  await sleep(15);

  assert.equal(contacts.state.value.length, 2);
  const asha = contacts.state.value.find((c) => c.name === 'Asha');
  const ravi = contacts.state.value.find((c) => c.name === 'Ravi');
  assert.equal(asha.phone, '+919876543210');
  assert.equal(asha.isPrimary, true);
  assert.equal(ravi.isPrimary, false);

  // Prevent duplicates
  await assert.rejects(contactSvc.addContact({ name: 'Duplicate Asha', phone: '+919876543210' }), { code: 'DUPLICATE_PHONE' });

  // Switch primary
  await contactSvc.setPrimary(ravi.id);
  await sleep(15);
  const refreshedContacts = fakeSupabase.tables.emergency_contacts;
  assert.equal(refreshedContacts.find((c) => c.id === ravi.id).is_primary, true);

  // Update contact
  await contactSvc.updateContact(ravi.id, { name: 'Ravi Kumar', phone: '+919123456789' });
  assert.equal(fakeSupabase.tables.emergency_contacts.find((c) => c.id === ravi.id).name, 'Ravi Kumar');

  // Delete contact
  await contactSvc.deleteContact(ravi.id);
  assert.equal(fakeSupabase.tables.emergency_contacts.length, 1);

  contacts.unsubscribe();
});

test('Supabase notifications: mark read, mark all read, clear', async () => {
  fakeSupabase.__writeTable('in_app_notifications', {
    id: 'n1',
    user_id: UID,
    type: 'accident',
    title: 'Incident 1',
    body: 'Detected',
    timestamp: new Date().toISOString(),
    read: false,
  });
  fakeSupabase.__writeTable('in_app_notifications', {
    id: 'n2',
    user_id: UID,
    type: 'accident',
    title: 'Incident 2',
    body: 'Detected',
    timestamp: new Date().toISOString(),
    read: false,
  });

  const inbox = watch(inboxSvc.subscribeNotifications);
  await sleep(15);
  assert.ok(inbox.state.value, 'inbox value is defined');
  assert.equal(inbox.state.value.length, 2);

  await inboxSvc.markRead('n1');
  assert.equal(fakeSupabase.tables.in_app_notifications.find((n) => n.id === 'n1').read, true);

  await inboxSvc.markAllRead();
  assert.ok(fakeSupabase.tables.in_app_notifications.every((n) => n.read === true));

  await inboxSvc.clearAll();
  assert.equal(fakeSupabase.tables.in_app_notifications.length, 0);

  inbox.unsubscribe();
});

test('Supabase settings: default safe settings and refusal of accidentThreshold', async () => {
  const settings = watch(settingsSvc.subscribeSettings);
  await sleep(15);
  assert.deepEqual(settings.state.value, {
    accidentThreshold: null,
    notifications: { push: true, sound: true },
  });

  await settingsSvc.updateSettings({ notifications: { sound: false } });
  const stored = fakeSupabase.tables.device_settings.find((s) => s.user_id === UID);
  assert.equal(stored.notifications_sound, false);

  // Client cannot change threshold
  await assert.rejects(settingsSvc.updateSettings({ accidentThreshold: 10 }), { code: 'UNSUPPORTED' });
  settings.unsubscribe();
});

test('Supabase push tokens: saves Expo push token with platform', async () => {
  await supabaseService.saveExpoPushToken('ExponentPushToken[supa.123]', 'android');
  const stored = fakeSupabase.tables.push_tokens;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].token, 'ExponentPushToken[supa.123]');
  assert.equal(stored[0].platform, 'android');

  await assert.rejects(supabaseService.saveExpoPushToken('', 'android'), { code: 'INVALID_TOKEN' });
  await assert.rejects(supabaseService.saveExpoPushToken('ExponentPushToken[supa.123]', 'windows'), { code: 'UNSUPPORTED_PLATFORM' });
});

test('Supabase Realtime: concurrent subscribers multiplex onto a single channel without subscribe errors', async () => {
  // Simulate concurrent subscriptions from multiple components / background services
  const sub1 = watch(alertSvc.subscribeAlerts);
  const sub2 = watch(alertSvc.subscribeAlerts);
  const sub3 = watch(alertSvc.subscribeAlerts);

  await sleep(15);
  assert.ok(Array.isArray(sub1.state.value));
  assert.ok(Array.isArray(sub2.state.value));
  assert.ok(Array.isArray(sub3.state.value));

  // Write an alert to trigger Realtime broadcast to all concurrent multiplexed listeners
  fakeSupabase.__writeTable('accident_alerts', {
    id: 'ALERT_CONCURRENT_01',
    helmet_id: 'HELMET_001',
    timestamp: new Date().toISOString(),
    severity: 'high',
    status: 'new',
    sms_status: 'simulated',
  });

  await sleep(20);
  assert.equal(sub1.state.value.length, 1);
  assert.equal(sub2.state.value.length, 1);
  assert.equal(sub3.state.value.length, 1);
  assert.equal(sub1.state.value[0].id, 'ALERT_CONCURRENT_01');
  assert.equal(sub2.state.value[0].id, 'ALERT_CONCURRENT_01');
  assert.equal(sub3.state.value[0].id, 'ALERT_CONCURRENT_01');

  // Unsubscribe 2 of them: sub3 remains active without error
  sub1.unsubscribe();
  sub2.unsubscribe();

  fakeSupabase.__writeTable('accident_alerts', {
    id: 'ALERT_CONCURRENT_02',
    helmet_id: 'HELMET_001',
    timestamp: new Date().toISOString(),
    severity: 'medium',
    status: 'new',
    sms_status: 'simulated',
  });

  await sleep(20);
  assert.equal(sub3.state.value.length, 2);

  // Unsubscribe last listener: triggers complete channel cleanup
  sub3.unsubscribe();
});

test('Supabase device mapping: missing sensor telemetry leaves mpuOk and gsmRegistered as null (Unknown), never fabricated Normal', async () => {
  fakeSupabase.__writeTable('helmets', { id: 'HELMET_001', name: 'Kavach Smart Helmet' });
  fakeSupabase.__writeTable('helmet_telemetry', {
    helmet_id: 'HELMET_001',
    battery_percentage: null, // missing battery
    helmet_status: 'disconnected',
    accident_status: 'normal',
    sensor_status: null, // missing sensor status
    gsm_status: null,    // missing GSM status
    recorded_at: new Date().toISOString(),
  });

  const refreshed = await deviceSvc.refreshDevice();
  assert.equal(refreshed.id, 'HELMET_001');
  assert.equal(refreshed.deviceId, 'HELMET_001');
  assert.equal(refreshed.deviceName, 'Kavach Smart Helmet');
  assert.equal(refreshed.batteryLevel, null, 'missing battery must be null');
  assert.equal(refreshed.mpuOk, null, 'missing sensor status must be null (Unknown), not fabricated OK');
  assert.equal(refreshed.gsmRegistered, null, 'missing GSM status must be null (Unknown), not fabricated Registered');
});

test('Supabase device mapping: gpsLastFixAt flows to derived device and correctly computes freshness', async () => {
  const now = Date.now();
  const freshTime = new Date(now - 30 * 1000).toISOString(); // 30 seconds ago
  const staleTime = new Date(now - 15 * 60 * 1000).toISOString(); // 15 minutes ago

  fakeSupabase.__writeTable('helmets', { id: 'HELMET_001', name: 'Kavach Smart Helmet' });
  fakeSupabase.__writeTable('helmet_telemetry', {
    helmet_id: 'HELMET_001',
    battery_percentage: 90,
    helmet_status: 'connected',
    accident_status: 'normal',
    sensor_status: 'ok',
    gsm_status: 'connected',
    recorded_at: freshTime,
  });
  fakeSupabase.__writeTable('helmet_locations', {
    helmet_id: 'HELMET_001',
    latitude: 12.9716,
    longitude: 77.5946,
    gps_valid: true,
    speed: 15.0,
    recorded_at: freshTime,
  });

  // Fresh fix within 5 minutes -> GPS status must be available
  const freshDevice = await deviceSvc.refreshDevice();
  assert.equal(freshDevice.gpsLastFixAt, freshTime);
  const derivedFresh = deriveDevice(freshDevice, now);
  assert.equal(derivedFresh.gpsStatus, 'available');
  assert.equal(derivedFresh.latitude, 12.9716);

  // Stale fix older than 5 minutes -> GPS status must be stale
  fakeSupabase.tables.helmet_locations = [];
  fakeSupabase.__writeTable('helmet_locations', {
    helmet_id: 'HELMET_001',
    latitude: 12.9716,
    longitude: 77.5946,
    gps_valid: true,
    speed: 0.0,
    recorded_at: staleTime,
  });

  const staleDevice = await deviceSvc.refreshDevice();
  assert.equal(staleDevice.gpsLastFixAt, staleTime);
  const derivedStale = deriveDevice(staleDevice, now);
  assert.equal(derivedStale.gpsStatus, 'stale');
});

