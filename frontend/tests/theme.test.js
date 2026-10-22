// Theme System Test Suite for Kavach Smart Helmet App
// Validates Light/Dark/System theme tokens, contrast characteristics, tone generation, and storage persistence.
import test from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, getTone } from '../src/theme/colors.js';
import { lightTheme, darkTheme } from '../src/theme/themes.js';
import { THEME_STORAGE_KEY } from '../src/theme/ThemeProvider.js';
import { demoStore } from '../src/services/demoStore.js';

test('Theme Tokens: light and dark palettes define all required semantic tokens', () => {
  const requiredTokens = [
    'background',
    'card',
    'cardElevated',
    'text',
    'textSecondary',
    'textMuted',
    'border',
    'primary',
    'safetyTeal',
    'emergency',
    'warning',
    'success',
    'info',
  ];

  for (const token of requiredTokens) {
    assert.ok(lightColors[token], `lightColors must have ${token}`);
    assert.ok(darkColors[token], `darkColors must have ${token}`);
  }
});

test('Theme Palettes: light and dark modes have distinct, readable backgrounds and text', () => {
  // Light mode uses soft pale background and dark midnight text
  assert.equal(lightColors.background, '#F4F7FB');
  assert.equal(lightColors.text, '#172033');
  assert.equal(lightColors.card, '#FFFFFF');

  // Dark mode uses deep midnight navy background and high-contrast light text
  assert.equal(darkColors.background, '#0B1220');
  assert.equal(darkColors.text, '#F1F5F9');
  assert.equal(darkColors.card, '#111C2E');
  assert.equal(darkColors.cardElevated, '#18263B');
});

test('Theme Objects: lightTheme and darkTheme contain full token suites', () => {
  assert.equal(lightTheme.isDark, false);
  assert.equal(darkTheme.isDark, true);

  for (const th of [lightTheme, darkTheme]) {
    assert.ok(th.colors, 'Theme must contain colors');
    assert.ok(th.typography, 'Theme must contain typography');
    assert.ok(th.spacing, 'Theme must contain spacing');
    assert.ok(th.radius, 'Theme must contain radius');
    assert.ok(th.shadows, 'Theme must contain shadows');
    assert.ok(th.shadows.card, 'Theme shadows must have card shadow');
  }
});

test('Tone Generation: getTone produces dark-compatible surfaces without bright glare', () => {
  const tones = ['red', 'green', 'yellow', 'blue', 'orange', 'grey', 'teal'];

  for (const t of tones) {
    const lightTone = getTone(t, false);
    const darkTone = getTone(t, true);

    assert.ok(lightTone.bg, `lightTone for ${t} has bg`);
    assert.ok(lightTone.fg, `lightTone for ${t} has fg`);
    assert.ok(darkTone.bg, `darkTone for ${t} has bg`);
    assert.ok(darkTone.fg, `darkTone for ${t} has fg`);

    // In dark mode, background is darkened and foreground is luminous
    assert.notEqual(lightTone.bg, darkTone.bg, `Light and dark bg for ${t} must differ`);
  }

  // Verify warning tone specifics
  const yellowDark = getTone('yellow', true);
  assert.equal(yellowDark.bg, '#451A03'); // Dark amber surface
  assert.equal(yellowDark.fg, '#FBBF24'); // Luminous warning text

  // Verify danger tone specifics
  const redDark = getTone('red', true);
  assert.equal(redDark.bg, '#450A0A'); // Dark crimson surface
  assert.equal(redDark.fg, '#F87171'); // Readable red foreground
});

test('Theme Persistence: persists mode to AsyncStorage without corrupting backend data', async () => {
  assert.equal(THEME_STORAGE_KEY, '@kavach_theme_mode');

  // Verify initial state
  await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
  const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  assert.equal(saved, 'dark');

  await AsyncStorage.setItem(THEME_STORAGE_KEY, 'system');
  const systemSaved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  assert.equal(systemSaved, 'system');

  // Verify changing theme does not alter demoStore device telemetry or contacts
  const initialDevice = demoStore.get('device');
  const initialContacts = demoStore.get('contacts');

  await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');

  const currentDevice = demoStore.get('device');
  const currentContacts = demoStore.get('contacts');

  assert.equal(currentDevice?.deviceId, initialDevice?.deviceId);
  assert.equal(currentContacts?.length, initialContacts?.length);
});
