// Repository consistency checks: things that broke when three people merged their code.
// Pure file reading, no app code is run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd(); // npm test runs from the frontend/ folder; firmware/ and backend/ are one level up
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));

function jsFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return jsFiles(rel);
    return e.name.endsWith('.js') ? [rel] : [];
  });
}

const sourceFiles = [...jsFiles('src'), 'App.js', 'index.js'];

function resolveRelative(fromFile, spec) {
  const base = path.resolve(root, path.dirname(fromFile), spec);
  return [base, `${base}.js`, path.join(base, 'index.js')].find(
    (p) => fs.existsSync(p) && fs.statSync(p).isFile()
  );
}

test('every relative import resolves, and named/default imports exist', () => {
  const problems = [];
  for (const file of sourceFiles) {
    const code = read(file);
    for (const m of code.matchAll(/(?:from\s*|import\s*|require\()\s*['"](\.[^'"]+)['"]/g)) {
      if (!resolveRelative(file, m[1])) problems.push(`${file}: cannot resolve ${m[1]}`);
    }
    for (const m of code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
      const target = resolveRelative(file, m[2]);
      if (!target) continue;
      const targetCode = fs.readFileSync(target, 'utf8');
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0];
        if (!name) continue;
        const exported = new RegExp(
          `export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b`
        );
        if (!exported.test(targetCode)) problems.push(`${file}: ${name} is not exported by ${m[2]}`);
      }
    }
    for (const m of code.matchAll(/import\s+\w+\s*(?:,\s*\{[^}]*\})?\s*from\s*['"](\.[^'"]+)['"]/g)) {
      const target = resolveRelative(file, m[1]);
      if (target && !/export\s+default/.test(fs.readFileSync(target, 'utf8'))) {
        problems.push(`${file}: ${m[1]} has no default export`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('every package the app imports is listed in package.json', () => {
  const pkg = json('package.json');
  const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
  const missing = new Set();
  for (const file of sourceFiles) {
    const code = read(file);
    for (const m of code.matchAll(/(?:from\s*|import\s*|require\()\s*['"]([^.'"][^'"]*)['"]/g)) {
      const parts = m[1].split('/');
      const name = m[1].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (!declared.has(name)) missing.add(`${name} (used in ${file})`);
    }
  }
  assert.deepEqual([...missing], []);
});

test('package.json has the scripts and tools the team relies on', () => {
  const pkg = json('package.json');
  assert.ok(pkg.scripts.start, 'npm start');
  assert.ok(pkg.scripts.test, 'npm test');
  assert.ok((pkg.devDependencies || {}).esbuild, 'esbuild (used by npm test)');
});

test('mock data is opt-in and alerts do not nest virtualized lists', () => {
  assert.match(read('src/config.js'), /EXPO_PUBLIC_DATA_SOURCE === 'demo' \? 'demo' : 'live'/);
  assert.match(read('src/screens/AlertsScreen.js'), /<ScreenContainer[^>]*scroll=\{false\}/);
  assert.doesNotMatch(read('src/services/notificationService.js'), /import \* as Notifications from 'expo-notifications'/);
});

test('Supabase schema, Edge Function, app and firmware use the same alert contract', () => {
  const schema = read('../supabase/migrations/20261023_init_kavach_schema.sql');
  assert.ok(schema.includes('accident_alerts'), 'schema: accident_alerts');
  assert.ok(schema.includes('helmet_telemetry'), 'schema: helmet_telemetry');

  assert.match(read('../supabase/functions/dispatch-accident-alert/index.ts'), /accident_alerts/);
  assert.match(read('src/services/supabaseService.js'), /accident_alerts/);

  // The firmware that gets flashed is firmware/KavachHelmet
  const ino = read('../firmware/KavachHelmet/KavachHelmet.ino');
  assert.match(ino, /telemetry/);
  assert.match(ino, /alert/);
});

test('app and firmware default to the same DEVICE_ID', () => {
  const firmware = read('../firmware/KavachHelmet/config.example.h').match(/#define\s+DEVICE_ID\s+"([^"]+)"/)[1];
  const app = read('src/services/supabaseService.js').match(/EXPO_PUBLIC_DEVICE_ID \|\| '([^']+)'/)[1];
  assert.equal(app, firmware);
  assert.match(read('.env.example'), new RegExp(`EXPO_PUBLIC_DEVICE_ID=${firmware}`));
});

test('secrets stay out of git', () => {
  const ignore = read('../.gitignore').split(/\r?\n/);
  assert.ok(ignore.includes('.env'), '.env ignored');
  assert.ok(ignore.includes('!.env.example'), '.env.example must stay committed (a ".env.*" rule would hide it)');
  assert.ok(ignore.lastIndexOf('!.env.example') > ignore.indexOf('.env.*') || !ignore.includes('.env.*'), '!.env.example must come after .env.*');
  assert.ok(ignore.includes('/firmware/KavachHelmet/config.h'), 'KavachHelmet config.h ignored');
  assert.ok(read('../firmware/.gitignore').includes('smart_helmet/config.h'), 'smart_helmet config.h ignored');
  });

test('app.json is spelled in lowercase (EAS Build runs on Linux, where App.json is not found)', () => {
  assert.ok(fs.readdirSync(root).includes('app.json'), 'rename App.json to app.json: git mv frontend/App.json frontend/app.json');
});

test('Android build config exists', () => {
  const app = json('app.json').expo;
  assert.ok(app.android && app.android.package, 'android.package set in app.json');
  const eas = json('eas.json');
  assert.equal(eas.build.preview.android.buildType, 'apk', 'preview profile builds an installable APK');
});
