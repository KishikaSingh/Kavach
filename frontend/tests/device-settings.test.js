import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHook, waitFor } from './fakes/react.js';
import { demoStore } from '../src/services/demoStore.js';
import useSettings from '../src/hooks/useSettings.js';
import DeviceHealthCard from '../src/components/DeviceHealthCard.js';
import DeviceSettingsScreen from '../src/screens/DeviceSettingsScreen.js';
import ScreenContainer from '../src/components/ScreenContainer.js';
import Loader from '../src/components/Loader.js';

test('DeviceHealthCard: renders safely with missing or undefined props', () => {
  // Should not throw even if every prop is missing
  const emptyCard = DeviceHealthCard({});
  assert.ok(emptyCard);
  assert.equal(emptyCard.type, 'View');

  // Should handle missing or null value and tone safely
  const nullPropsCard = DeviceHealthCard({
    icon: null,
    label: null,
    value: null,
    tone: null,
    note: null,
  });
  assert.ok(nullPropsCard);
  assert.equal(nullPropsCard.type, 'View');
});

test('DeviceHealthCard: renders accidentThreshold card correctly with null and non-null note', () => {
  const cardWithNullThreshold = DeviceHealthCard({
    icon: 'speedometer',
    label: 'Accident threshold',
    value: 'Unavailable',
    tone: 'grey',
    note: 'Cannot be changed from the app yet',
  });
  assert.equal(cardWithNullThreshold.props.children[1].props.children[0].props.children, 'Accident threshold');
  assert.equal(cardWithNullThreshold.props.children[1].props.children[1].props.children, 'Cannot be changed from the app yet');

  const cardWithThresholdValue = DeviceHealthCard({
    icon: 'speedometer',
    label: 'Accident threshold',
    value: 'Unavailable',
    tone: 'grey',
    note: 'Current: 2.5',
  });
  assert.equal(cardWithThresholdValue.props.children[1].props.children[1].props.children, 'Current: 2.5');
});

test('REGRESSION TEST: DeviceSettingsScreen does NOT crash when settings is null', () => {
  demoStore.reset();
  // On initial mount before subscription emits, settings is null
  // In the original code, this threw: TypeError: Cannot read property 'accidentThreshold' of null
  assert.doesNotThrow(() => {
    const screenElement = renderHook(() => DeviceSettingsScreen());
    try {
      assert.ok(screenElement.result.current);
    } finally {
      screenElement.unmount();
    }
  });
});

test('DeviceSettingsScreen: initial loading state when settings and device are loading', () => {
  demoStore.reset();
  const h = renderHook(() => DeviceSettingsScreen());
  try {
    assert.ok(h.result.current);
    assert.equal(h.result.current.type, ScreenContainer);
    // Children during initial load is Loader
    assert.equal(h.result.current.props.children.type, Loader);
  } finally {
    h.unmount();
  }
});

test('DeviceSettingsScreen: renders full screen when device and settings are loaded', async () => {
  demoStore.reset();
  const h = renderHook(() => DeviceSettingsScreen());
  try {
    await demoStore.delay(350);
    const screen = h.result.current;
    assert.ok(screen);
    assert.equal(screen.type, ScreenContainer);
    // Children is an array of UI sections
    assert.ok(Array.isArray(screen.props.children));
  } finally {
    h.unmount();
  }
});

test('DeviceSettingsScreen: handles missing accidentThreshold property gracefully', async () => {
  demoStore.reset();
  // Settings with accidentThreshold property omitted entirely
  demoStore.set('settings', { notifications: { push: true, sound: true } });

  const h = renderHook(() => DeviceSettingsScreen());
  try {
    await demoStore.delay(350);
    assert.doesNotThrow(() => {
      const screen = h.result.current;
      assert.ok(screen);
      assert.equal(screen.type, ScreenContainer);
    });
  } finally {
    h.unmount();
  }
});

test('DeviceSettingsScreen: handles explicit accidentThreshold value', async () => {
  demoStore.reset();
  demoStore.set('settings', { accidentThreshold: 3.5, notifications: { push: true, sound: true } });

  const h = renderHook(() => DeviceSettingsScreen());
  try {
    await demoStore.delay(350);
    assert.doesNotThrow(() => {
      const screen = h.result.current;
      assert.ok(screen);
      assert.equal(screen.type, ScreenContainer);
    });
  } finally {
    h.unmount();
  }
});

test('DeviceSettingsScreen: handles device === null after loading (empty / unselected device)', async () => {
  demoStore.reset();
  demoStore.set('device', null);

  const h = renderHook(() => DeviceSettingsScreen());
  try {
    await demoStore.delay(350);
    assert.doesNotThrow(() => {
      const screen = h.result.current;
      assert.ok(screen);
      assert.equal(screen.type, ScreenContainer);
    });
  } finally {
    h.unmount();
  }
});

test('DeviceSettingsScreen: handles backend unavailable scenario', async () => {
  demoStore.reset();
  demoStore.setScenario('backendUnreachable');

  const h = renderHook(() => DeviceSettingsScreen());
  try {
    await demoStore.delay(350);
    assert.doesNotThrow(() => {
      const screen = h.result.current;
      assert.ok(screen);
      assert.equal(screen.type, ScreenContainer);
    });
  } finally {
    h.unmount();
  }
});

test('DeviceSettingsScreen: saving valid settings merges notifications', async () => {
  demoStore.reset();
  const hook = renderHook(() => useSettings());
  try {
    await waitFor(() => !hook.result.current.loading, 'settings loaded');

    assert.equal(hook.result.current.settings.notifications.push, true);
    await hook.result.current.updateSettings({ notifications: { push: false } });

    await waitFor(() => hook.result.current.settings.notifications.push === false, 'push disabled');
    assert.equal(hook.result.current.settings.notifications.sound, true);
  } finally {
    hook.unmount();
  }
});

test('DeviceSettingsScreen: settings refresh and retry work properly', async () => {
  demoStore.reset();
  const h = renderHook(() => useSettings());
  try {
    await waitFor(() => !h.result.current.loading, 'loaded');

    assert.equal(typeof h.result.current.retry, 'function');
    assert.equal(typeof h.result.current.updateSettings, 'function');
    // Trigger retry
    h.result.current.retry();
    await demoStore.delay(100);
    assert.ok(h.result.current.settings);
  } finally {
    h.unmount();
  }
});
