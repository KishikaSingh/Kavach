import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Device Settings route registration: AppNavigator registers DeviceSettingsScreen under Settings tab', () => {
  const navCode = read('src/navigation/AppNavigator.js');
  // Verify DeviceSettingsScreen is imported
  assert.match(navCode, /import\s+DeviceSettingsScreen\s+from\s+['"]\.\.\/screens\/DeviceSettingsScreen['"]/);
  // Verify Tab.Screen name is "Settings" with component={DeviceSettingsScreen}
  assert.match(navCode, /<Tab\.Screen\s+name=["']Settings["']\s+component=\{DeviceSettingsScreen\}/);
  // Verify Tab icons for Settings exist
  assert.match(navCode, /Settings:\s*\[['"]settings['"],\s*['"]settings-outline['"]\]/);
});

test('DashboardScreen navigation: manage and quick action buttons navigate to Settings', () => {
  const dashCode = read('src/screens/DashboardScreen.js');
  // Must NOT contain navigate('DeviceSettings')
  assert.doesNotMatch(dashCode, /navigation\.navigate\(['"]DeviceSettings['"]\)/);
  // Must contain navigation to Settings
  assert.match(dashCode, /navigation\.navigate\(['"]Settings['"]\)/);
});

test('ProfileScreen navigation: hardware rows navigate to Main -> Settings', () => {
  const profileCode = read('src/screens/ProfileScreen.js');
  // Must NOT contain navigate('DeviceSettings')
  assert.doesNotMatch(profileCode, /navigation\.navigate\(['"]DeviceSettings['"]\)/);
  // Must navigate to nested Settings tab inside Main
  assert.match(profileCode, /navigation\.navigate\(['"]Main['"],\s*\{\s*screen:\s*['"]Settings['"]\s*\}\)/);
});

test('Static audit: No screen invokes unhandled DeviceSettings route', () => {
  function getJsFiles(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return getJsFiles(fullPath);
      return entry.name.endsWith('.js') ? [fullPath] : [];
    });
  }

  const srcFiles = getJsFiles('src');
  const invalidCalls = [];

  for (const file of srcFiles) {
    const code = read(file);
    if (/navigation(?:\.|\?\.)navigate\(\s*['"]DeviceSettings['"]\s*\)/.test(code)) {
      invalidCalls.push(file);
    }
  }

  assert.deepEqual(invalidCalls, [], 'No files should call navigation.navigate("DeviceSettings")');
});
