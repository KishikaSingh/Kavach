// The JSON the firmware REALLY writes (tests/fixtures/firmware-payloads.json, made by `make fixtures` in firmware/)
// must be accepted by the Firebase rules and understood by the app.
// If you change firmware/smart_helmet/payloads.h, run `make fixtures` in firmware/ and then `npm test`.
import './helpers/live-env.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as fake from 'firebase/database';
import { watch, sleep } from './helpers/collect.js';
import * as deviceSvc from '../src/services/deviceService.js';
import * as alertSvc from '../src/services/alertService.js';
import { deriveDevice, getGpsState, hasValidCoords, smsLabel } from '../src/utils/deviceStatus.js';

const root = process.cwd();
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/firmware-payloads.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(root, '../backend/firebase/database.rules.json'), 'utf8')).rules;

// Checks the two kinds of .validate expression our rules use. Firebase treats null fields as "not there".
function passesValidate(rule, data) {
  const expr = rule['.validate'];
  if (!expr) return true;
  for (const m of expr.matchAll(/hasChildren\(\[([^\]]*)\]\)/g)) {
    const required = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    if (!required.every((k) => data[k] !== undefined && data[k] !== null)) return false;
  }
  const allowed = [...expr.matchAll(/child\('status'\)\.val\(\) === '(\w+)'/g)].map((x) => x[1]);
  if (allowed.length && !allowed.includes(data.status)) return false;
  return true;
}
const deviceRule = rules.devices.$deviceId;
const alertRule = rules.alerts.$deviceId.$alertId;

beforeEach(() => fake.__reset());

test('fixtures are present and parse', async () => {
  for (const key of ['device', 'deviceNoGps', 'alertCreate', 'alertCreateNoGps', 'alertPatchSent', 'alertPatchConfirmed']) {
    assert.ok(fixtures[key], `fixture ${key}`);
  }
});

test('database rules accept the firmware payloads', async () => {
  assert.ok(passesValidate(deviceRule, fixtures.device));
  assert.ok(passesValidate(deviceRule, fixtures.deviceNoGps), 'device without GPS must still be accepted');
  assert.ok(passesValidate(alertRule, fixtures.alertCreate));
  assert.ok(passesValidate(alertRule, fixtures.alertCreateNoGps), 'alert without GPS must still be accepted');
  // the rules really do reject bad data (guards the checker itself)
  assert.ok(!passesValidate(alertRule, { ...fixtures.alertCreate, status: 'done' }));
  assert.ok(!passesValidate(deviceRule, { helmetStatus: 'connected' }));
});

test('frozen vocabulary: only the agreed status values are used', async () => {
  assert.equal(fixtures.device.helmetStatus, 'connected');
  assert.ok(['normal', 'warning', 'alert'].includes(fixtures.device.accidentStatus));
  assert.ok(['normal', 'warning', 'alert'].includes(fixtures.deviceNoGps.accidentStatus));
  for (const key of ['alertCreate', 'alertCreateNoGps', 'alertPatchSent', 'alertPatchConfirmed', 'alertPatchFailed']) {
    const a = fixtures[key];
    if (a.status) assert.ok(['new', 'sent', 'resolved'].includes(a.status), `${key} status ${a.status}`);
    if (a.smsStatus) assert.ok(['pending', 'confirmed', 'failed', 'unknown'].includes(a.smsStatus), `${key} smsStatus`);
  }
});

test('a healthy helmet shows on the app as connected with a usable location', async () => {
  const device = watch(deviceSvc.subscribeDevice);
  await sleep(0);
  fake.__write('devices/HELMET_001', fixtures.device);
  const now = Date.parse(fixtures.device.lastUpdated) + 3000; // 3 s after the helmet reported
  const shown = deriveDevice(device.state.value, now);
  assert.equal(shown.helmetStatus, 'connected');
  assert.equal(shown.gpsStatus, 'available');
  assert.equal(shown.latitude, 28.6692);
  assert.equal(hasValidCoords(shown), true);
  assert.equal(shown.batteryLevel, null, 'no battery sensor: stays unknown');
  // helmet stops reporting: app marks it disconnected after 30 s
  assert.equal(deriveDevice(device.state.value, Date.parse(fixtures.device.lastUpdated) + 31000).helmetStatus, 'disconnected');
  device.unsubscribe();
});

test('without a GPS fix the app shows no coordinates and no map marker', async () => {
  fake.__write('devices/HELMET_001', fixtures.deviceNoGps);
  const device = watch(deviceSvc.subscribeDevice);
  await sleep(0);
  const shown = deriveDevice(device.state.value, Date.parse(fixtures.deviceNoGps.lastUpdated) + 1000);
  assert.equal(shown.latitude, null);
  assert.equal(hasValidCoords(shown), false);
  assert.equal(getGpsState(shown), 'searching');
  assert.equal(shown.accidentStatus, 'warning');
  device.unsubscribe();
});

test('an accident: alert is created, then the helmet reports the SMS result', async () => {
  const alerts = watch(alertSvc.subscribeAlerts);
  await sleep(0);
  fake.__write('alerts/HELMET_001/-N1', fixtures.alertCreate);
  let a = alerts.state.value[0];
  assert.equal(a.id, '-N1');
  assert.equal(a.status, 'new');
  assert.equal(smsLabel(a.smsStatus).label, 'SMS pending');
  assert.equal(hasValidCoords(a), true);

  // helmet PATCHes the record (same keys it sends): accepted by the network, no delivery report yet
  for (const [k, v] of Object.entries(fixtures.alertPatchSent)) fake.__write(`alerts/HELMET_001/-N1/${k}`, v);
  a = alerts.state.value[0];
  assert.equal(a.status, 'sent');
  assert.equal(smsLabel(a.smsStatus).label, 'SMS pending', 'accepted is not delivered');

  // delivery report arrives
  for (const [k, v] of Object.entries(fixtures.alertPatchConfirmed)) fake.__write(`alerts/HELMET_001/-N1/${k}`, v);
  a = alerts.state.value[0];
  assert.equal(smsLabel(a.smsStatus).label, 'SMS delivered');
  alerts.unsubscribe();
});

test('an accident without GPS: alert carries null coordinates and the app does not invent any', async () => {
  const alerts = watch(alertSvc.subscribeAlerts);
  await sleep(0);
  fake.__write('alerts/HELMET_001/-N2', fixtures.alertCreateNoGps);
  const a = alerts.state.value[0];
  assert.equal(a.latitude ?? null, null);
  assert.equal(hasValidCoords(a), false);
  alerts.unsubscribe();
});

test('failed SMS is shown as failed', async () => {
  assert.equal(smsLabel(fixtures.alertPatchFailed.smsStatus).label, 'SMS failed');
  assert.equal(smsLabel('unknown').label, 'SMS status unknown');
});

test('the flashed firmware (KavachHelmet) writes the fields the rules and the app expect', () => {
  const ino = fs.readFileSync(path.join(process.cwd(), '..', 'firmware', 'KavachHelmet', 'KavachHelmet.ino'), 'utf8');
  for (const field of ['deviceId', 'helmetStatus', 'accidentStatus', 'gpsValid', 'latitude', 'longitude', 'gpsLastFixAt', 'gsmRegistered', 'mpuOk', 'lastUpdated']) {
    assert.ok(ino.includes(`telemetry["${field}"]`), `telemetry.${field}`);
  }
  for (const field of ['timestamp', 'severity', 'gpsValid', 'status', 'smsStatus', 'deviceId']) {
    assert.ok(ino.includes(`alert["${field}"]`), `alert.${field}`);
  }
  assert.ok(ino.includes('alert["status"] = "new"'), 'new alerts start as "new" so the Cloud Function notifies');
  assert.ok(!ino.includes('setInsecure'), 'TLS verification stays on');
});
