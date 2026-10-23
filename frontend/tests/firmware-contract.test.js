// The JSON the firmware REALLY writes (tests/fixtures/firmware-payloads.json, made by `make fixtures` in firmware/)
// must conform to the database schema and be understood by the app.
import './helpers/supabase-live-env.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as fakeSupabase from './fakes/supabase.js';
import { watch, sleep } from './helpers/collect.js';
import * as deviceSvc from '../src/services/deviceService.js';
import * as alertSvc from '../src/services/alertService.js';
import { resetLiveBackend } from '../src/services/liveAdapter.js';
import { deriveDevice, getGpsState, hasValidCoords, smsLabel } from '../src/utils/deviceStatus.js';

const root = process.cwd();
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/firmware-payloads.json'), 'utf8'));

// Validates required device and alert payload fields
const REQUIRED_DEVICE_FIELDS = ['deviceId', 'helmetStatus', 'accidentStatus'];
const REQUIRED_ALERT_FIELDS = ['timestamp', 'severity', 'status'];

function passesValidateDevice(data) {
  if (!REQUIRED_DEVICE_FIELDS.every((k) => data[k] !== undefined && data[k] !== null)) return false;
  return ['normal', 'warning', 'alert'].includes(data.accidentStatus);
}

function passesValidateAlert(data) {
  if (!REQUIRED_ALERT_FIELDS.every((k) => data[k] !== undefined && data[k] !== null)) return false;
  return ['new', 'sent', 'resolved'].includes(data.status);
}

beforeEach(() => {
  resetLiveBackend();
  fakeSupabase.__reset();
});

test('fixtures are present and parse', async () => {
  for (const key of ['device', 'deviceNoGps', 'alertCreate', 'alertCreateNoGps', 'alertPatchSent', 'alertPatchConfirmed']) {
    assert.ok(fixtures[key], `fixture ${key}`);
  }
});

test('database schema accepts the firmware payloads', async () => {
  assert.ok(passesValidateDevice(fixtures.device));
  assert.ok(passesValidateDevice(fixtures.deviceNoGps), 'device without GPS must still be accepted');
  assert.ok(passesValidateAlert(fixtures.alertCreate));
  assert.ok(passesValidateAlert(fixtures.alertCreateNoGps), 'alert without GPS must still be accepted');
  // guards rejection of invalid status
  assert.ok(!passesValidateAlert({ ...fixtures.alertCreate, status: 'done' }));
  assert.ok(!passesValidateDevice({ helmetStatus: 'connected' }));
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
  fakeSupabase.__writeTable('helmets', { id: 'HELMET_001', name: 'Demo Helmet' });
  fakeSupabase.__writeTable('helmet_telemetry', {
    helmet_id: 'HELMET_001',
    battery_percentage: fixtures.device.batteryLevel,
    helmet_status: fixtures.device.helmetStatus,
    accident_status: fixtures.device.accidentStatus,
    sensor_status: fixtures.device.mpuOk ? 'ok' : 'fault',
    gsm_status: fixtures.device.gsmRegistered ? 'connected' : 'disconnected',
    recorded_at: fixtures.device.lastUpdated,
  });
  fakeSupabase.__writeTable('helmet_locations', {
    helmet_id: 'HELMET_001',
    latitude: fixtures.device.latitude,
    longitude: fixtures.device.longitude,
    gps_valid: fixtures.device.gpsValid,
    speed: 0.0,
    recorded_at: fixtures.device.gpsLastFixAt || fixtures.device.lastUpdated,
  });

  const refreshed = await deviceSvc.refreshDevice();
  const now = Date.parse(fixtures.device.lastUpdated) + 3000; // 3 s after the helmet reported
  const shown = deriveDevice(refreshed, now);
  assert.equal(shown.helmetStatus, 'connected');
  assert.equal(shown.gpsStatus, 'available');
  assert.equal(shown.latitude, 28.6692);
  assert.equal(hasValidCoords(shown), true);
  assert.equal(shown.batteryLevel, null, 'no battery sensor: stays unknown');
  // helmet stops reporting: app marks it disconnected after 30 s
  assert.equal(deriveDevice(refreshed, Date.parse(fixtures.device.lastUpdated) + 31000).helmetStatus, 'disconnected');
});

test('without a GPS fix the app shows no coordinates and no map marker', async () => {
  fakeSupabase.__writeTable('helmets', { id: 'HELMET_001', name: 'Demo Helmet' });
  fakeSupabase.__writeTable('helmet_telemetry', {
    helmet_id: 'HELMET_001',
    battery_percentage: null,
    helmet_status: fixtures.deviceNoGps.helmetStatus,
    accident_status: fixtures.deviceNoGps.accidentStatus,
    sensor_status: 'ok',
    gsm_status: 'connected',
    recorded_at: fixtures.deviceNoGps.lastUpdated,
  });
  fakeSupabase.__writeTable('helmet_locations', {
    helmet_id: 'HELMET_001',
    latitude: null,
    longitude: null,
    gps_valid: false,
    speed: 0.0,
    recorded_at: fixtures.deviceNoGps.lastUpdated,
  });

  const refreshed = await deviceSvc.refreshDevice();
  const shown = deriveDevice(refreshed, Date.parse(fixtures.deviceNoGps.lastUpdated) + 1000);
  assert.equal(shown.latitude, null);
  assert.equal(hasValidCoords(shown), false);
  assert.equal(getGpsState(shown), 'searching');
  assert.equal(shown.accidentStatus, 'warning');
});

test('an accident: alert is created, then the helmet reports the SMS result', async () => {
  fakeSupabase.__writeTable('accident_alerts', {
    id: '-N1',
    helmet_id: 'HELMET_001',
    timestamp: fixtures.alertCreate.timestamp,
    severity: fixtures.alertCreate.severity,
    latitude: fixtures.alertCreate.latitude,
    longitude: fixtures.alertCreate.longitude,
    gps_valid: fixtures.alertCreate.gpsValid,
    status: fixtures.alertCreate.status,
    sms_status: fixtures.alertCreate.smsStatus,
  });

  const alerts = watch(alertSvc.subscribeAlerts);
  await sleep(15);
  let a = alerts.state.value[0];
  assert.equal(a.id, '-N1');
  assert.equal(a.status, 'new');
  assert.equal(smsLabel(a.smsStatus).label, 'SMS pending');
  assert.equal(hasValidCoords(a), true);

  // Helmet patches alert: status = 'sent'
  fakeSupabase.tables.accident_alerts.forEach((row) => {
    if (row.id === '-N1') {
      row.status = fixtures.alertPatchSent.status;
      row.sms_status = fixtures.alertPatchSent.smsStatus;
      row.smsStatus = fixtures.alertPatchSent.smsStatus;
    }
  });
  fakeSupabase.__notifyRealtime('accident_alerts', 'UPDATE', { id: '-N1', status: 'sent', sms_status: 'pending' });
  await sleep(15);
  a = alerts.state.value[0];
  assert.equal(a.status, 'sent');
  assert.equal(smsLabel(a.smsStatus).label, 'SMS pending', 'accepted is not delivered');

  // Delivery report arrives
  fakeSupabase.tables.accident_alerts.forEach((row) => {
    if (row.id === '-N1') {
      row.status = fixtures.alertPatchConfirmed.status;
      row.sms_status = fixtures.alertPatchConfirmed.smsStatus;
      row.smsStatus = fixtures.alertPatchConfirmed.smsStatus;
    }
  });
  fakeSupabase.__notifyRealtime('accident_alerts', 'UPDATE', { id: '-N1', status: 'sent', sms_status: 'confirmed' });
  await sleep(15);
  a = alerts.state.value[0];
  assert.equal(smsLabel(a.smsStatus).label, 'SMS delivered');
  alerts.unsubscribe();
});

test('an accident without GPS: alert carries null coordinates and the app does not invent any', async () => {
  fakeSupabase.__writeTable('accident_alerts', {
    id: '-N2',
    helmet_id: 'HELMET_001',
    timestamp: fixtures.alertCreateNoGps.timestamp,
    severity: fixtures.alertCreateNoGps.severity,
    latitude: null,
    longitude: null,
    gps_valid: false,
    status: fixtures.alertCreateNoGps.status,
    sms_status: fixtures.alertCreateNoGps.smsStatus,
  });

  const alerts = watch(alertSvc.subscribeAlerts);
  await sleep(15);
  const a = alerts.state.value[0];
  assert.equal(a.latitude ?? null, null);
  assert.equal(hasValidCoords(a), false);
  alerts.unsubscribe();
});

test('failed SMS is shown as failed', async () => {
  assert.equal(smsLabel(fixtures.alertPatchFailed.smsStatus).label, 'SMS failed');
  assert.equal(smsLabel('unknown').label, 'SMS status unknown');
});

test('the flashed firmware (KavachHelmet) writes the fields the schema and the app expect', () => {
  const ino = fs.readFileSync(path.join(process.cwd(), '..', 'firmware', 'KavachHelmet', 'KavachHelmet.ino'), 'utf8');
  for (const field of ['deviceId', 'helmetStatus', 'accidentStatus', 'gpsValid', 'latitude', 'longitude', 'gpsLastFixAt', 'gsmRegistered', 'mpuOk', 'lastUpdated']) {
    assert.ok(ino.includes(`telemetry["${field}"]`), `telemetry.${field}`);
  }
  for (const field of ['timestamp', 'severity', 'gpsValid', 'status', 'smsStatus', 'deviceId']) {
    assert.ok(ino.includes(`alert["${field}"]`), `alert.${field}`);
  }
  assert.ok(ino.includes('alert["status"] = "new"'), 'new alerts start as "new" so the Edge function notifies');
  assert.ok(!ino.includes('setInsecure'), 'TLS verification stays on');
});
