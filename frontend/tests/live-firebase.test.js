// Live mode end to end, without internet: services -> liveAdapter -> Person 2's firebaseService -> in-memory Firebase.
// Also covers what the helmet does (writes /devices and /alerts) and what the app does back (resolve, contacts, ...).
import './helpers/live-env.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fake from 'firebase/database';
import { watch, sleep } from './helpers/collect.js';
import { getLiveBackend } from '../src/services/liveAdapter.js';
import * as deviceSvc from '../src/services/deviceService.js';
import * as alertSvc from '../src/services/alertService.js';
import * as contactSvc from '../src/services/contactService.js';
import * as inboxSvc from '../src/services/inboxService.js';
import * as settingsSvc from '../src/services/settingsService.js';
import * as firebaseService from '../src/services/firebaseService.js';

const UID = 'test-user-1'; // fake anonymous sign-in user (tests/fakes/firebase-auth.js)
const HELMET_DEVICE = {
  deviceId: 'HELMET_001', helmetStatus: 'connected', accidentStatus: 'alert',
  latitude: 28.6692, longitude: 77.4538, gpsValid: true, gpsLastFixAt: '2026-10-11T11:42:00Z',
  gsmRegistered: true, mpuOk: true, lastUpdated: '2026-10-11T11:42:05Z',
};
const NEW_ALERT = {
  timestamp: '2026-10-11T11:42:05Z', severity: 'high', latitude: 28.6692, longitude: 77.4538,
  gpsValid: true, status: 'new', smsStatus: 'pending',
};

beforeEach(() => fake.__reset());

test('live mode uses firebaseService as its backend', () => {
  const backend = getLiveBackend();
  assert.deepEqual(Object.keys(backend).sort(), Object.keys(firebaseService).sort());
  assert.equal(backend.DEVICE_ID, 'HELMET_001');
  for (const fn of [
    'subscribeDevice', 'subscribeApp', 'refreshDevice', 'subscribeAlerts', 'resolveAlert',
    'subscribeContacts', 'addContact', 'updateContact', 'deleteContact', 'setPrimary',
    'subscribeNotifications', 'markRead', 'markAllRead', 'clearAll', 'subscribeSettings', 'updateSettings',
  ]) {
    assert.equal(typeof firebaseService[fn], 'function', `firebaseService.${fn}`);
  }
});

test('device: empty database gives no device (never fake data), then follows the helmet live', async () => {
  const device = watch(deviceSvc.subscribeDevice);
  await sleep(0);
  assert.equal(device.state.value, null);
  fake.__write('devices/HELMET_001', HELMET_DEVICE);
  assert.equal(device.state.value.accidentStatus, 'alert');
  assert.equal(device.state.value.latitude, 28.6692);
  fake.__write('devices/HELMET_001/accidentStatus', 'normal');
  assert.equal(device.state.value.accidentStatus, 'normal');
  device.unsubscribe();
  assert.equal(fake.__listenerCount(), 0);
  await deviceSvc.refreshDevice(); // must not throw
});

test('app info says live and reachable', async () => {
  const app = watch(deviceSvc.subscribeApp);
  await sleep(0);
  assert.deepEqual(app.state.value, { dataSource: 'live', backendReachable: true });
});

test('alerts are read from /alerts/{deviceId}, not from a flat /alerts list', async () => {
  fake.__write('alerts/HELMET_001/a1', NEW_ALERT);
  fake.__write('alerts/stray', { ...NEW_ALERT, timestamp: '2026-10-11T12:00:00Z' });
  const alerts = watch(alertSvc.subscribeAlerts);
  await sleep(0);
  assert.deepEqual(alerts.state.value.map((a) => a.id), ['a1']);
  assert.equal(alerts.state.value[0].smsStatus, 'pending');
  // the helmet later reports delivery: the app sees the update
  fake.__write('alerts/HELMET_001/a1/smsStatus', 'confirmed');
  assert.equal(alerts.state.value[0].smsStatus, 'confirmed');
  alerts.unsubscribe();
});

test('resolving an alert: status and a notification (the app never writes /devices)', async () => {
  fake.__write('devices/HELMET_001', HELMET_DEVICE);
  fake.__write('alerts/HELMET_001/a1', NEW_ALERT);
  await alertSvc.resolveAlert('a1');
  assert.equal(fake.__read('alerts/HELMET_001/a1/status'), 'resolved');
  assert.equal(fake.__read('devices/HELMET_001/accidentStatus'), 'alert', 'only the helmet writes /devices');
  const notifications = Object.values(fake.__read(`users/${UID}/notifications`));
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'Alert resolved');
  await alertSvc.resolveAlert('a1'); // resolving twice is harmless
  assert.equal(Object.keys(fake.__read(`users/${UID}/notifications`)).length, 1);
  await assert.rejects(alertSvc.resolveAlert('missing'), { code: 'NOT_FOUND' });
});

test('resolving one alert leaves the helmet-owned device record untouched', async () => {
  fake.__write('devices/HELMET_001', HELMET_DEVICE);
  fake.__write('alerts/HELMET_001/a1', NEW_ALERT);
  fake.__write('alerts/HELMET_001/a2', { ...NEW_ALERT, timestamp: '2026-10-11T11:50:00Z' });
  await alertSvc.resolveAlert('a1');
  assert.equal(fake.__read('devices/HELMET_001/accidentStatus'), 'alert');
});

test('contacts: validation, first is primary, duplicates, primary moves', async () => {
  const contacts = watch(contactSvc.subscribeContacts); // live duplicate checks use this list
  await sleep(0);
  await assert.rejects(contactSvc.addContact({ name: 'X', phone: '9876543210' }), { code: 'INVALID_NAME' });
  await assert.rejects(contactSvc.addContact({ name: 'Asha', phone: '123' }), { code: 'INVALID_PHONE' });
  await contactSvc.addContact({ name: 'Asha', phone: '98765 43210' });
  await contactSvc.addContact({ name: 'Ravi', phone: '9123456789' });
  assert.equal(contacts.state.value.length, 2);
  assert.equal(contacts.state.value.find((c) => c.name === 'Asha').phone, '+919876543210');
  assert.deepEqual(contacts.state.value.filter((c) => c.isPrimary).map((c) => c.name), ['Asha']);
  await assert.rejects(contactSvc.addContact({ name: 'Dup', phone: '+919876543210' }), { code: 'DUPLICATE_PHONE' });

  const ravi = contacts.state.value.find((c) => c.name === 'Ravi');
  await contactSvc.setPrimary(ravi.id);
  assert.deepEqual(contacts.state.value.filter((c) => c.isPrimary).map((c) => c.name), ['Ravi']);
  await contactSvc.updateContact(ravi.id, { name: 'Ravi K', phone: '+919123456789' });
  assert.equal(contacts.state.value.find((c) => c.id === ravi.id).name, 'Ravi K');
  await contactSvc.deleteContact(ravi.id);
  assert.equal(contacts.state.value.length, 1);
  await assert.rejects(contactSvc.deleteContact('missing'), { code: 'NOT_FOUND' });
  contacts.unsubscribe();
});

test('notifications: mark read, mark all read, clear', async () => {
  fake.__write(`users/${UID}/notifications/n1`, { type: 'accident', title: 'A', body: 'a', timestamp: '2026-10-11T10:00:00Z', read: false });
  fake.__write(`users/${UID}/notifications/n2`, { type: 'accident', title: 'B', body: 'b', timestamp: '2026-10-11T11:00:00Z', read: false });
  const list = watch(inboxSvc.subscribeNotifications);
  await sleep(0);
  assert.equal(list.state.value.length, 2);
  await inboxSvc.markRead('n1');
  assert.deepEqual(list.state.value.map((n) => n.read).sort(), [false, true]);
  await inboxSvc.markAllRead();
  assert.ok(list.state.value.every((n) => n.read));
  await inboxSvc.clearAll();
  assert.equal(list.state.value.length, 0);
  list.unsubscribe();
});

test('settings: defaults, merge, accidentThreshold refused', async () => {
  const settings = watch(settingsSvc.subscribeSettings);
  await sleep(0);
  assert.deepEqual(settings.state.value, { accidentThreshold: null, notifications: { push: true, sound: true } });
  await settingsSvc.updateSettings({ notifications: { sound: false } });
  assert.deepEqual(settings.state.value.notifications, { push: true, sound: false });
  await assert.rejects(settingsSvc.updateSettings({ accidentThreshold: 5 }), { code: 'UNSUPPORTED' });
  settings.unsubscribe();
});

test('push token is stored under a Firebase-safe key, per user', async () => {
  await firebaseService.saveExpoPushToken('ExponentPushToken[abc.def]', 'android');
  const stored = fake.__read(`users/${UID}/pushTokens`);
  const [key] = Object.keys(stored);
  assert.ok(!/[.#$[\]]/.test(key), `unsafe key ${key}`);
  assert.equal(stored[key].token, 'ExponentPushToken[abc.def]');
  assert.equal(stored[key].platform, 'android');
  await assert.rejects(firebaseService.saveExpoPushToken('', 'android'), { code: 'INVALID_TOKEN' });
  assert.equal(Object.keys(fake.__read(`users/${UID}/pushTokens`)).length, 1);
});

test('subscriptions are cleaned up', async () => {
  const subs = [
    watch(deviceSvc.subscribeDevice), watch(alertSvc.subscribeAlerts), watch(contactSvc.subscribeContacts),
    watch(inboxSvc.subscribeNotifications), watch(settingsSvc.subscribeSettings),
  ];
  await sleep(0);
  assert.equal(fake.__listenerCount(), 5);
  subs.forEach((s) => s.unsubscribe());
  await sleep(0);
  assert.equal(fake.__listenerCount(), 0);
});
