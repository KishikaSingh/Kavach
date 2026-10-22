// Repeatable seed script for hardware-free testing
// Populates test devices, owner permissions, emergency contacts, user settings, telemetry, and alerts.
// Can target Firebase Emulator (default 127.0.0.1:9000) or a dedicated development Firebase project.

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

async function seed() {
  console.log(`[Seed] Target database: ${databaseURL} (Emulator: ${isEmulator})`);
  console.log(`[Seed] Provisioning device: ${TEST_DEVICE_ID}, owner: ${TEST_USER_UID}`);

  const now = new Date().toISOString();

  // 1. Dedicated test device telemetry (conforms to database.rules.json schema)
  const deviceData = {
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

  // Also seed default HELMET_001 for convenience
  const defaultHelmetData = {
    ...deviceData,
    deviceId: 'HELMET_001',
  };

  // 2. Fictional emergency contacts
  const contactsData = {
    contact_1: {
      name: 'Dr. Vikram Sarabhai',
      phone: '+919999900001',
      isPrimary: true,
    },
    contact_2: {
      name: 'Dr. APJ Abdul Kalam',
      phone: '+919999900002',
      isPrimary: false,
    },
    contact_3: {
      name: 'Prof. Satish Dhawan',
      phone: '+919999900003',
      isPrimary: false,
    },
  };

  // 3. Documented settings schema
  const settingsData = {
    notifications: {
      push: true,
      sound: true,
    },
  };

  // 4. Sample alerts
  const alertsData = {
    alert_dev_1: {
      timestamp: now,
      severity: 'high',
      latitude: 28.6692,
      longitude: 77.4538,
      gpsValid: true,
      status: 'new',
      smsStatus: 'pending',
      deviceId: TEST_DEVICE_ID,
    },
    alert_dev_2: {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: 'medium',
      latitude: 28.6500,
      longitude: 77.4400,
      gpsValid: true,
      status: 'sent',
      smsStatus: 'confirmed',
      deviceId: TEST_DEVICE_ID,
    },
    alert_dev_3: {
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      severity: 'low',
      latitude: null,
      longitude: null,
      gpsValid: false,
      status: 'resolved',
      smsStatus: 'failed',
      deviceId: TEST_DEVICE_ID,
    },
  };

  // 5. Sample user inbox notifications
  const notificationsData = {
    notif_dev_1: {
      type: 'accident',
      title: 'Accident detected',
      body: 'Location: 28.66920, 77.45380',
      timestamp: now,
      read: false,
      alertId: 'alert_dev_1',
      deviceId: TEST_DEVICE_ID,
    },
    notif_dev_2: {
      type: 'sensor',
      title: 'Sensor warning',
      body: 'MPU6050 sensor fault was resolved.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      read: true,
    },
    notif_dev_3: {
      type: 'alertUpdate',
      title: 'Alert resolved',
      body: 'The earlier alert was marked as resolved.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      read: true,
    },
  };

  const updates = {
    [`devices/${TEST_DEVICE_ID}`]: deviceData,
    [`devices/HELMET_001`]: defaultHelmetData,
    [`deviceOwners/${TEST_DEVICE_ID}/${TEST_USER_UID}`]: true,
    [`deviceOwners/HELMET_001/${TEST_USER_UID}`]: true,
    [`users/${TEST_USER_UID}/contacts`]: contactsData,
    [`users/${TEST_USER_UID}/settings`]: settingsData,
    [`users/${TEST_USER_UID}/notifications`]: notificationsData,
    [`alerts/${TEST_DEVICE_ID}`]: alertsData,
  };

  await db.ref().update(updates);
  console.log('[Seed] Successfully seeded test device, contacts, settings, and sample alerts!');
}

seed()
  .catch((err) => {
    console.error('[Seed Error]', err);
    process.exitCode = 1;
  })
  .finally(() => {
    admin.app().delete().catch(() => {});
  });
