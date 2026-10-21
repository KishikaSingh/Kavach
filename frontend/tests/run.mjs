// Runs every tests/**/*.test.js with Node's built-in test runner.
//   npm test
// Each test file is bundled with esbuild first, so the app's import style (no file extensions)
// and `require('firebase/...')` work, and 'firebase/*' is replaced by the in-memory fake.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.test-build');

function findTests(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'fakes' || name === 'fixtures' ? [] : findTests(full);
    return name.endsWith('.test.js') ? [full] : [];
  });
}

const only = process.argv[2]; // optional: npm test -- demo   (runs files whose name contains "demo")
const entries = findTests(join(root, 'tests')).filter((f) => !only || f.includes(only));
if (!entries.length) {
  console.error('No test files found.');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: entries,
  outdir: out,
  outbase: join(root, 'tests'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  logLevel: 'error',
  loader: { '.js': 'jsx' },
  alias: {
    'firebase/app': join(root, 'tests/fakes/firebase-app.js'),
    'firebase/database': join(root, 'tests/fakes/firebase-database.js'),
    'firebase/auth': join(root, 'tests/fakes/firebase-auth.js'),
    'react-native': join(root, 'tests/fakes/react-native.js'),
    '@react-native-async-storage/async-storage': join(root, 'tests/fakes/async-storage.js'),
    react: join(root, 'tests/fakes/react.js'),
  },
  // 'react' is replaced by a tiny stand-in so the data hooks can run without a screen.
  external: ['expo-notifications', 'expo-constants', 'expo-device'],
});

const built = entries.map((f) => join(out, relative(join(root, 'tests'), f)));
const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...built], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, EXPO_PUBLIC_DATA_SOURCE: 'demo' },
});
rmSync(out, { recursive: true, force: true });
process.exit(result.status ?? 1);
