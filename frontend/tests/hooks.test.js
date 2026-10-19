// The data hooks that screens use, run against the demo data with a tiny React stand-in (tests/fakes/react.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHook, waitFor } from './fakes/react.js';
import { demoStore } from '../src/services/demoStore.js';
import { useDevice } from '../src/hooks/useDevice.js';
import { useAlerts } from '../src/hooks/useAlerts.js';
import { useContacts } from '../src/hooks/useContacts.js';
import { useNotifications } from '../src/hooks/useNotifications.js';
import { useSettings } from '../src/hooks/useSettings.js';
import { useDemoControls } from '../src/hooks/useDemoControls.js';
import useDeviceDefault from '../src/hooks/useDevice.js';
import useAlertsDefault from '../src/hooks/useAlerts.js';
import * as hookIndex from '../src/hooks/index.js';

test('hooks are exported both ways (named for Person 2, default for Person 1)', () => {
  assert.equal(useDeviceDefault, useDevice);
  assert.equal(useAlertsDefault, useAlerts);
  for (const name of ['useDevice', 'useAlerts', 'useContacts', 'useNotifications', 'useSettings', 'useDemoControls']) {
    assert.equal(typeof hookIndex[name], 'function', name);
  }
});

test('useDevice: loading, then derived device', async () => {
  demoStore.reset();
  const h = renderHook(() => useDevice());
  assert.equal(h.result.current.loading, true);
  await waitFor(() => !h.result.current.loading, 'device loaded');
  const { device, dataSource, backendReachable } = h.result.current;
  assert.equal(dataSource, 'demo');
  assert.equal(backendReachable, null);
  assert.equal(device.helmetStatus, 'connected');
  assert.equal(device.gpsStatus, 'available');
  h.unmount();
});

test('useDevice follows scenario changes: offline and no GPS', async () => {
  demoStore.reset();
  const h = renderHook(() => useDevice());
  await waitFor(() => !h.result.current.loading, 'loaded');
  demoStore.setScenario('offline');
  await waitFor(() => h.result.current.device.helmetStatus === 'disconnected', 'offline');
  demoStore.setScenario('gpsUnavailable');
  await waitFor(() => h.result.current.device.gpsStatus !== 'available', 'gps lost');
  assert.equal(h.result.current.device.latitude, null);
  h.unmount();
});

test('useAlerts: newest first, active alerts, resolve only on explicit call', async () => {
  demoStore.setScenario('newAlert');
  const h = renderHook(() => useAlerts());
  await waitFor(() => !h.result.current.loading, 'alerts loaded');
  const { alerts, activeAlerts } = h.result.current;
  const times = alerts.map((a) => new Date(a.timestamp).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
  assert.equal(activeAlerts.length, 1, 'viewing does not resolve');
  await h.result.current.resolveAlert(activeAlerts[0].id);
  await waitFor(() => h.result.current.activeAlerts.length === 0, 'resolved');
  h.unmount();
});

test('useContacts: primary contact and actions', async () => {
  demoStore.reset();
  const h = renderHook(() => useContacts());
  await waitFor(() => !h.result.current.loading, 'contacts loaded');
  assert.equal(h.result.current.isConfigured, true);
  assert.equal(h.result.current.primaryContact.isPrimary, true);
  await h.result.current.addContact({ name: 'Hook Test', phone: '9000000001' });
  await waitFor(() => h.result.current.contacts.some((c) => c.name === 'Hook Test'), 'contact added');
  await assert.rejects(h.result.current.addContact({ name: 'Hook Test', phone: '9000000001' }), { code: 'DUPLICATE_PHONE' });
  h.unmount();
});

test('useNotifications: unread count follows markAllRead', async () => {
  demoStore.reset();
  const h = renderHook(() => useNotifications());
  await waitFor(() => !h.result.current.loading, 'loaded');
  assert.ok(h.result.current.unreadCount > 0);
  await h.result.current.markAllRead();
  await waitFor(() => h.result.current.unreadCount === 0, 'all read');
  h.unmount();
});

test('useSettings: merge notification switches, threshold refused', async () => {
  demoStore.reset();
  const h = renderHook(() => useSettings());
  await waitFor(() => !h.result.current.loading, 'loaded');
  assert.equal(h.result.current.settings.accidentThreshold, null);
  await h.result.current.updateSettings({ notifications: { sound: false } });
  await waitFor(() => h.result.current.settings.notifications.sound === false, 'sound off');
  assert.equal(h.result.current.settings.notifications.push, true);
  await assert.rejects(h.result.current.updateSettings({ accidentThreshold: 4 }), { code: 'UNSUPPORTED' });
  h.unmount();
});

test('useDemoControls: scenario list and switching', () => {
  demoStore.reset();
  const h = renderHook(() => useDemoControls());
  assert.equal(h.result.current.isDemo, true);
  assert.ok(h.result.current.scenarios.includes('newAlert'));
  h.result.current.setScenario('newAlert');
  assert.equal(demoStore.getScenario(), 'newAlert');
  h.result.current.setScenario('not-a-scenario'); // ignored
  assert.equal(demoStore.getScenario(), 'newAlert');
  h.unmount();
});
