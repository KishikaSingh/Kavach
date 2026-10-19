// Demo mode (default): services, validation rules and derived device state. No Firebase involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, validateName } from '../src/utils/validators.js';
import { deriveDevice } from '../src/utils/deviceStatus.js';
import { buildScenario, SCENARIOS } from '../src/data/mockData.js';
import { demoStore } from '../src/services/demoStore.js';
import * as contacts from '../src/services/contactService.js';
import * as alerts from '../src/services/alertService.js';
import * as inbox from '../src/services/inboxService.js';
import * as settings from '../src/services/settingsService.js';
import * as deviceSvc from '../src/services/deviceService.js';
import { googleMapsUrl, hasValidCoordinates } from '../src/utils/mapLinks.js';
import { relativeTime } from '../src/utils/formatTime.js';

const first = (subscribe) => new Promise((res, rej) => {
  const unsub = subscribe((d) => { unsub(); res(d); }, rej);
});

test('phone validation', () => {
  assert.equal(normalizePhone('98765 43210').value, '+919876543210');
  assert.equal(normalizePhone('+91 98765-43210').value, '+919876543210');
  assert.equal(normalizePhone('09876543210').value, '+919876543210');
  assert.equal(normalizePhone('+14155552671').value, '+14155552671');
  for (const bad of ['', 'abc', '12345', '5876543210', '+0123456789', null]) {
    assert.equal(normalizePhone(bad).ok, false, `should reject ${bad}`);
  }
  assert.equal(validateName(' A ').ok, false);
  assert.equal(validateName(' Asha ').value, 'Asha');
});

test('derived device rules per scenario', () => {
  const d = (s) => deriveDevice(buildScenario(s).device);
  assert.equal(d('normal').helmetStatus, 'connected');
  assert.equal(d('normal').gpsStatus, 'available');
  assert.equal(d('offline').helmetStatus, 'disconnected');
  const noGps = d('gpsUnavailable');
  assert.equal(noGps.latitude, null); assert.equal(noGps.longitude, null);
  assert.equal(noGps.gpsStatus, 'searching');
  assert.equal(d('gpsStale').gpsStatus, 'stale');
  assert.equal(hasValidCoordinates(d('gpsStale')), true);
  const empty = d('emptyDevice');
  assert.equal(empty.gpsStatus, 'unavailable'); assert.equal(empty.helmetStatus, 'disconnected');
  assert.equal(hasValidCoordinates(empty), false);
  assert.equal(d('backendUnreachable').helmetStatus, 'disconnected');
  // raw gps coords are hidden when gpsValid false even if stored
  assert.equal(deriveDevice({ ...buildScenario('normal').device, gpsValid: false }).latitude, null);
  assert.equal(googleMapsUrl(null, 1), null);
  assert.match(googleMapsUrl(28.6, 77.4), /maps\?q=28.6,77.4/);
  assert.equal(relativeTime(null), 'Never');
  assert.equal(SCENARIOS.every((s) => buildScenario(s).device), true);
});

test('contacts: add, validate, duplicate, primary', async () => {
  demoStore.reset();
  let list = await first(contacts.subscribeContacts);
  assert.equal(list.length, 3);
  await assert.rejects(contacts.addContact({ name: 'X', phone: '9876543210' }), { code: 'INVALID_NAME' });
  await assert.rejects(contacts.addContact({ name: 'Asha', phone: '123' }), { code: 'INVALID_PHONE' });
  await contacts.addContact({ name: 'Asha', phone: '98765 43210' });
  await assert.rejects(contacts.addContact({ name: 'Dup', phone: '+919876543210' }), { code: 'DUPLICATE_PHONE' });
  list = demoStore.get('contacts');
  assert.equal(list.length, 4);
  assert.equal(list.filter((c) => c.isPrimary).length, 1);
  const asha = list.find((c) => c.name === 'Asha');
  await contacts.setPrimary(asha.id);
  list = demoStore.get('contacts');
  assert.equal(list.filter((c) => c.isPrimary).length, 1);
  assert.equal(list.find((c) => c.isPrimary).id, asha.id);
  await assert.rejects(contacts.updateContact(asha.id, { name: 'Asha', phone: '+919999900001' }), { code: 'DUPLICATE_PHONE' });
  await contacts.updateContact(asha.id, { name: 'Asha K', phone: '+919876543210' });
  await assert.rejects(contacts.updateContact('nope', { name: 'Asha', phone: '+919876543211' }), { code: 'NOT_FOUND' });
  for (const c of demoStore.get('contacts')) await contacts.deleteContact(c.id);
  assert.equal(demoStore.get('contacts').length, 0);
  await contacts.addContact({ name: 'First One', phone: '9123456789' });
  assert.equal(demoStore.get('contacts')[0].isPrimary, true); // first becomes primary
});

test('alerts: resolve only on explicit call, clears device alert', async () => {
  demoStore.setScenario('newAlert');
  assert.equal(demoStore.get('device').accidentStatus, 'alert');
  const list = await first(alerts.subscribeAlerts); // viewing / subscribing resolves nothing
  assert.equal(list.filter((a) => a.status === 'new').length, 1);
  const unread = demoStore.get('notifications').length;
  await alerts.resolveAlert('a8');
  assert.equal(demoStore.get('alerts').find((a) => a.id === 'a8').status, 'resolved');
  assert.equal(demoStore.get('device').accidentStatus, 'normal');
  assert.equal(demoStore.get('notifications').length, unread + 1);
  await assert.rejects(alerts.resolveAlert('zzz'), { code: 'NOT_FOUND' });
});

test('notifications and settings', async () => {
  demoStore.reset();
  assert.ok(demoStore.get('notifications').some((n) => !n.read));
  const id = demoStore.get('notifications').find((n) => !n.read).id;
  await inbox.markRead(id);
  assert.equal(demoStore.get('notifications').find((n) => n.id === id).read, true);
  await inbox.markAllRead();
  assert.equal(demoStore.get('notifications').every((n) => n.read), true);
  await inbox.clearAll();
  assert.equal(demoStore.get('notifications').length, 0);
  await assert.rejects(settings.updateSettings({ accidentThreshold: 3 }), { code: 'UNSUPPORTED' });
  await settings.updateSettings({ notifications: { sound: false } });
  assert.deepEqual(demoStore.get('settings').notifications, { push: true, sound: false });
});

test('subscribe emits updates, unsubscribe stops them, heartbeat refreshes lastUpdated', async () => {
  demoStore.reset();
  const seen = [];
  const unsub = deviceSvc.subscribeDevice((d) => seen.push(d));
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(seen.length, 1);
  demoStore.setScenario('offline');
  assert.equal(seen.length, 2);
  const before = demoStore.get('device').lastUpdated;
  await deviceSvc.refreshDevice(); // offline helmet stays silent
  assert.equal(demoStore.get('device').lastUpdated, before);
  demoStore.setScenario('normal');
  await new Promise((r) => setTimeout(r, 10));
  const n = seen.length;
  unsub();
  demoStore.setScenario('gpsStale');
  assert.equal(seen.length, n); // nothing after unsubscribe
  const app = await first(deviceSvc.subscribeApp);
  assert.deepEqual(app, { dataSource: 'demo', backendReachable: null });
});
