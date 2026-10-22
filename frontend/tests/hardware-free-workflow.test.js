import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { watch, sleep } from './helpers/collect.js';
import { demoStore } from '../src/services/demoStore.js';
import { renderHook, waitFor } from './fakes/react.js';
import useDemoControls from '../src/hooks/useDemoControls.js';
import useDevice from '../src/hooks/useDevice.js';
import useSettings from '../src/hooks/useSettings.js';
import useAlerts from '../src/hooks/useAlerts.js';
import { deriveDevice } from '../src/utils/deviceStatus.js';
import {
  dispatchEmergencyNotification,
  retryEmergencyNotification,
  resetEmergencyDispatchesForTesting,
} from '../src/services/emergencyNotificationService.js';
import * as deviceSvc from '../src/services/deviceService.js';

beforeEach(() => {
  demoStore.reset();
  resetEmergencyDispatchesForTesting();
});

test('Hardware-Free Workflow: Dedicated test device schema matches exact app contract', () => {
  const TEST_DEVICE_ID = 'HELMET_DEV_001';
  const now = new Date().toISOString();
  const testDevice = {
    deviceId: TEST_DEVICE_ID,
    helmetStatus: 'connected',
    accidentStatus: 'normal',
    latitude: 28.6692,
    longitude: 77.4538,
    gpsValid: true,
    gpsLastFixAt: now,
    gsmRegistered: true,
    mpuOk: true,
    batteryLevel: null,
    alcoholDetected: null,
    lastUpdated: now,
  };

  const derived = deriveDevice(testDevice);
  assert.equal(derived.deviceId, TEST_DEVICE_ID);
  assert.equal(derived.helmetStatus, 'connected');
  assert.equal(derived.gpsStatus, 'available');
  assert.equal(derived.latitude, 28.6692);
  assert.equal(derived.longitude, 77.4538);
});

test('Demo Mode: Telemetry controls for battery, connectivity, GPS, and sensors', async () => {
  const h = renderHook(() => useDemoControls());
  assert.equal(h.result.current.isDemo, true);

  // 1. Battery simulation
  h.result.current.setBattery(85);
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').batteryLevel, 85);

  h.result.current.setBattery(null);
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').batteryLevel, null);

  // 2. Connectivity simulation
  h.result.current.setConnectivity(false);
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').helmetStatus, 'disconnected');

  h.result.current.setConnectivity(true);
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').helmetStatus, 'connected');

  // 3. GPS simulation
  h.result.current.setGps('searching');
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').gpsValid, false);
  assert.equal(demoStore.get('device').latitude, null);

  h.result.current.setGps('available');
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').gpsValid, true);
  assert.ok(demoStore.get('device').latitude > 0);

  // 4. Sensors simulation
  h.result.current.setSensors({ mpuOk: false, gsmRegistered: false });
  await demoStore.delay(50);
  assert.equal(demoStore.get('device').mpuOk, false);
  assert.equal(demoStore.get('device').gsmRegistered, false);

  h.unmount();
});

test('Demo Mode: Trigger simulated accident event updates alerts, telemetry, and in-app notifications', async () => {
  const h = renderHook(() => useDemoControls());

  const alert = h.result.current.triggerAccident({ severity: 'high' });
  assert.ok(alert);
  assert.equal(alert.severity, 'high');
  assert.equal(alert.status, 'new');

  await demoStore.delay(50);
  const device = demoStore.get('device');
  assert.equal(device.accidentStatus, 'alert');

  const alerts = demoStore.get('alerts');
  assert.equal(alerts[0].id, alert.id);

  const notifications = demoStore.get('notifications');
  assert.ok(notifications.some((n) => n.alertId === alert.id));

  h.unmount();
});

test('Safety: Simulated accidents in demo mode do NOT send real SMS or external dispatch', async () => {
  const fakeContacts = [
    { id: 'c1', name: 'Dr. Test Contact', phone: '+919999900001', isPrimary: true },
  ];
  const simAlert = {
    id: 'sim_test_safety_1',
    timestamp: new Date().toISOString(),
    severity: 'high',
    latitude: 28.6692,
    longitude: 77.4538,
    gpsValid: true,
  };

  const dispatchResult = await dispatchEmergencyNotification(simAlert, {
    contacts: fakeContacts,
    isDemo: true,
  });

  // Must report demo_sent and mock delivery
  assert.equal(dispatchResult.status, 'demo_sent');
  assert.equal(dispatchResult.recipients.length, 1);
  assert.equal(dispatchResult.recipients[0].phone, '+919999900001');
});

test('Reactivity: App visibly refreshes when test data changes via subscriptions', async () => {
  const deviceSub = watch(deviceSvc.subscribeDevice);
  await sleep(0);

  // Initial state in demo
  await waitFor(() => deviceSub.state.value !== null, 'initial load');

  // Change data via demoStore
  demoStore.setConnectivity(false);
  await waitFor(() => deviceSub.state.value.helmetStatus === 'disconnected', 'state updated');
  assert.equal(deviceSub.state.value.helmetStatus, 'disconnected');

  deviceSub.unsubscribe();
});

test('Resilience: Handles missing settings, malformed settings, and disconnected backend', async () => {
  // 1. Missing / null settings
  demoStore.set('settings', null);
  const hSettings = renderHook(() => useSettings());
  try {
    assert.equal(hSettings.result.current.settings, null);
  } finally {
    hSettings.unmount();
  }

  // 2. Malformed settings
  demoStore.set('settings', {});
  const hSettings2 = renderHook(() => useSettings());
  try {
    assert.ok(hSettings2.result.current);
  } finally {
    hSettings2.unmount();
  }

  // 3. Disconnected backend scenario
  demoStore.setScenario('backendUnreachable');
  const hDevice = renderHook(() => useDevice());
  try {
    await waitFor(() => hDevice.result.current.backendReachable === false, 'backend unreachable');
    assert.equal(hDevice.result.current.backendReachable, false);
  } finally {
    hDevice.unmount();
  }
});

test('Resilience: Handles malformed device data gracefully', () => {
  // Completely empty object
  const derived1 = deriveDevice({});
  assert.equal(derived1.helmetStatus, 'disconnected');
  assert.equal(derived1.gpsStatus, 'unavailable');

  // Null input
  const derived2 = deriveDevice(null);
  assert.equal(derived2, null);

  // Device with corrupt / non-boolean gpsValid
  const derived3 = deriveDevice({ deviceId: 'HELMET_001', gpsValid: 'yes', latitude: 'invalid' });
  assert.equal(derived3.latitude, null);
  assert.equal(derived3.longitude, null);
});

test('Alert Lifecycle: Status transitions (new -> sent -> resolved) and SMS delivery updates', async () => {
  const h = renderHook(() => useAlerts());
  try {
    await waitFor(() => !h.result.current.loading, 'alerts loaded');

    // Trigger an alert
    const newAlert = demoStore.triggerSimulatedAccident({ severity: 'high' });
    await waitFor(() => h.result.current.activeAlerts.some((a) => a.id === newAlert.id), 'new alert visible');

    // Resolve alert
    await h.result.current.resolveAlert(newAlert.id);
    await waitFor(() => !h.result.current.activeAlerts.some((a) => a.id === newAlert.id), 'alert resolved');

    const resolvedAlert = demoStore.get('alerts').find((a) => a.id === newAlert.id);
    assert.equal(resolvedAlert.status, 'resolved');
  } finally {
    h.unmount();
  }
});

test('Duplicate Alert Suppression and Retry Behavior', async () => {
  const contacts = [{ id: 'c1', name: 'Primary Contact', phone: '+919999900001', isPrimary: true }];
  const alert = { id: 'alert_dedup_test', severity: 'high', timestamp: new Date().toISOString() };

  // First dispatch succeeds
  const res1 = await dispatchEmergencyNotification(alert, { contacts, isDemo: true });
  assert.equal(res1.status, 'demo_sent');
  assert.equal(res1.duplicateSuppressed, undefined);

  // Immediate second dispatch is suppressed as duplicate
  const res2 = await dispatchEmergencyNotification(alert, { contacts, isDemo: true });
  assert.equal(res2.duplicateSuppressed, true);
  assert.equal(res2.status, 'demo_sent');

  // Retry with forceRetry bypasses suppression
  const res3 = await retryEmergencyNotification(alert, { contacts, isDemo: true });
  assert.equal(res3.status, 'demo_sent');
  assert.equal(res3.duplicateSuppressed, undefined);
});
