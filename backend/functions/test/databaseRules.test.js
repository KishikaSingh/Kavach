const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { ref, get, set, update } = require('firebase/database');

const projectId = 'demo-kavach';
const ownerUid = 'owner-user';
const strangerUid = 'unrelated-user';
const deviceId = 'HELMET_001';
const rules = fs.readFileSync(path.join(__dirname, '../../firebase/database.rules.json'), 'utf8');
let environment;

const validDevice = {
  deviceId,
  helmetStatus: 'connected',
  accidentStatus: 'alert',
  gpsValid: true,
  latitude: 28.67,
  longitude: 77.45,
  lastUpdated: new Date().toISOString(),
};

const validAlert = {
  timestamp: new Date().toISOString(),
  severity: 'high',
  latitude: 28.67,
  longitude: 77.45,
  gpsValid: true,
  status: 'new',
  smsStatus: 'pending',
  deviceId,
};

test.before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    database: { rules, host: '127.0.0.1', port: 9000 },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.database();
    await set(ref(database, `deviceOwners/${deviceId}/${ownerUid}`), true);
    await set(ref(database, `devices/${deviceId}`), validDevice);
    await set(ref(database, `alerts/${deviceId}/existing-alert`), validAlert);
  });
});

test.after(async () => {
  await environment?.cleanup();
});

test('denies unauthenticated and unrelated access to helmet data', async () => {
  const publicDatabase = environment.unauthenticatedContext().database();
  const strangerDatabase = environment.authenticatedContext(strangerUid).database();

  await assertFails(get(ref(publicDatabase, `devices/${deviceId}`)));
  await assertFails(get(ref(strangerDatabase, `devices/${deviceId}`)));
  await assertFails(get(ref(strangerDatabase, `alerts/${deviceId}`)));
});

test('allows an owner to read helmet data and resolve alerts only', async () => {
  const database = environment.authenticatedContext(ownerUid).database();

  await assertSucceeds(get(ref(database, `devices/${deviceId}`)));
  await assertSucceeds(get(ref(database, `alerts/${deviceId}`)));
  await assertSucceeds(update(ref(database, `alerts/${deviceId}/existing-alert`), { status: 'resolved' }));
  await assertFails(update(ref(database, `alerts/${deviceId}/existing-alert`), { smsStatus: 'confirmed' }));
  await assertFails(update(ref(database, `alerts/${deviceId}/existing-alert`), { status: 'sent' }));
});

test('allows the provisioned helmet identity to report data but not resolve alerts', async () => {
  const database = environment.authenticatedContext('helmet-writer', { device_id: deviceId }).database();
  const secondAlert = { ...validAlert, status: 'new' };

  await assertFails(get(ref(database, `devices/${deviceId}`)));
  await assertSucceeds(set(ref(database, `devices/${deviceId}`), validDevice));
  await assertSucceeds(set(ref(database, `alerts/${deviceId}/new-alert`), secondAlert));
  await assertSucceeds(update(ref(database, `alerts/${deviceId}/new-alert`), { smsStatus: 'confirmed' }));
  await assertFails(update(ref(database, `alerts/${deviceId}/new-alert`), { status: 'resolved' }));
  await assertFails(set(ref(database, 'devices/OTHER_HELMET'), { ...validDevice, deviceId: 'OTHER_HELMET' }));
});

test('isolates user records and validates contact and Expo token formats', async () => {
  const ownerDatabase = environment.authenticatedContext(ownerUid).database();
  const strangerDatabase = environment.authenticatedContext(strangerUid).database();
  const contact = { name: 'Emergency Contact', phone: '+919876543210', isPrimary: true };

  await assertSucceeds(set(ref(ownerDatabase, `users/${ownerUid}/contacts/contact-1`), contact));
  await assertSucceeds(get(ref(ownerDatabase, `users/${ownerUid}/contacts`)));
  await assertFails(get(ref(strangerDatabase, `users/${ownerUid}/contacts`)));
  await assertFails(set(ref(ownerDatabase, `users/${strangerUid}/contacts/contact-1`), contact));
  await assertFails(set(ref(ownerDatabase, `users/${ownerUid}/contacts/bad-phone`), {
    ...contact,
    phone: 'not-a-phone',
  }));

  await assertSucceeds(set(ref(ownerDatabase, `users/${ownerUid}/pushTokens/token-1`), {
    token: 'ExponentPushToken[valid_token-123]',
    platform: 'android',
    updatedAt: new Date().toISOString(),
  }));
  await assertFails(set(ref(ownerDatabase, `users/${ownerUid}/pushTokens/token-2`), {
    token: 'not-an-expo-token',
    platform: 'android',
    updatedAt: new Date().toISOString(),
  }));
  await assertFails(get(ref(ownerDatabase, `users/${ownerUid}/pushTokens`)));
});
