// Repeatable reset script for hardware-free testing
// Clears seeded test device data, alerts, contacts, settings, and notifications.

const admin = require('firebase-admin');

const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
const isEmulator = !process.env.FIREBASE_DATABASE_URL || Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);

if (isEmulator) {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = emulatorHost;
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  }
}

const databaseURL = isEmulator
  ? `http://${emulatorHost}?ns=demo-kavach`
  : process.env.FIREBASE_DATABASE_URL;

const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-kavach';
const TEST_DEVICE_ID = process.env.DEVICE_ID || 'HELMET_DEV_001';
const TEST_USER_UID = process.env.TEST_USER_UID || 'test-user-dev';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
    databaseURL,
    ...(isEmulator ? {} : { credential: admin.credential.applicationDefault() }),
  });
}

const db = admin.database();

async function reset() {
  console.log(`[Reset] Target database: ${databaseURL} (Emulator: ${isEmulator})`);
  console.log(`[Reset] Removing test data for device: ${TEST_DEVICE_ID}, owner: ${TEST_USER_UID}`);

  const updates = {
    [`devices/${TEST_DEVICE_ID}`]: null,
    [`deviceOwners/${TEST_DEVICE_ID}/${TEST_USER_UID}`]: null,
    [`users/${TEST_USER_UID}/contacts`]: null,
    [`users/${TEST_USER_UID}/settings`]: null,
    [`users/${TEST_USER_UID}/notifications`]: null,
    [`alerts/${TEST_DEVICE_ID}`]: null,
  };

  await db.ref().update(updates);
  console.log('[Reset] Successfully cleared test data.');
}

reset()
  .catch((err) => {
    console.error('[Reset Error]', err);
    process.exitCode = 1;
  })
  .finally(() => {
    admin.app().delete().catch(() => {});
  });
