import { ServiceError } from './serviceError.js';

// Live backend for Person 3's liveAdapter.getLiveBackend().
// Screens must not import this file; they go through hooks.
// Firebase is loaded lazily so demo mode does not need the `firebase` package.

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || 'HELMET_001';

let cached = null;

function firebaseConfig() {
  const databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!databaseURL || !apiKey || !projectId) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      'Live mode is on but Firebase env vars are missing. See firebase/SETUP.md.'
    );
  }
  return {
    apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL,
    projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

function sdk() {
  if (cached) return cached;
  let appMod;
  let dbMod;
  try {
    appMod = require('firebase/app');
    dbMod = require('firebase/database');
  } catch (error) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      'Live mode is on but the firebase package is not installed yet.'
    );
  }
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig());
  cached = {
    db: dbMod.getDatabase(app),
    ref: dbMod.ref,
    onValue: dbMod.onValue,
    get: dbMod.get,
    set: dbMod.set,
    update: dbMod.update,
    push: dbMod.push,
    remove: dbMod.remove,
  };
  return cached;
}

function toList(snapshotVal) {
  if (!snapshotVal) return [];
  return Object.entries(snapshotVal).map(([id, value]) => ({ id, ...(value || {}) }));
}

function listen(path, mapValue, onData, onError) {
  try {
    const { db, ref, onValue } = sdk();
    const r = ref(db, path);
    return onValue(
      r,
      (snap) => {
        try {
          onData(mapValue(snap.val()));
        } catch (error) {
          if (onError) onError(error);
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  } catch (error) {
    if (onError) onError(error);
    return () => {};
  }
}

export function subscribeDevice(onData, onError) {
  return listen(`devices/${DEVICE_ID}`, (val) => val || null, onData, onError);
}

export function subscribeApp(onData, onError) {
  return listen(
    '.info/connected',
    (connected) => ({
      dataSource: 'live',
      backendReachable: connected === true,
    }),
    onData,
    onError
  );
}

export async function refreshDevice() {
  const { db, ref, get } = sdk();
  await get(ref(db, `devices/${DEVICE_ID}`));
}

export function subscribeAlerts(onData, onError) {
  return listen(`alerts/${DEVICE_ID}`, toList, onData, onError);
}

export async function refreshAlerts() {
  const { db, ref, get } = sdk();
  await get(ref(db, `alerts/${DEVICE_ID}`));
}

export async function resolveAlert(id) {
  const { db, ref, get, update, push } = sdk();
  const alertRef = ref(db, `alerts/${DEVICE_ID}/${id}`);
  const snap = await get(alertRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Alert not found.');
  const current = snap.val() || {};
  if (current.status === 'resolved') return;

  await update(alertRef, { status: 'resolved' });

  const alertsSnap = await get(ref(db, `alerts/${DEVICE_ID}`));
  const remainingNew = toList(alertsSnap.val()).some((a) => a.status === 'new');
  if (!remainingNew) {
    const deviceRef = ref(db, `devices/${DEVICE_ID}`);
    const deviceSnap = await get(deviceRef);
    if (deviceSnap.exists() && deviceSnap.val()?.accidentStatus === 'alert') {
      await update(deviceRef, { accidentStatus: 'normal' });
    }
  }

  await push(ref(db, 'notifications'), {
    type: 'alertUpdate',
    title: 'Alert resolved',
    body: 'You marked an accident alert as resolved.',
    timestamp: new Date().toISOString(),
    read: false,
  });
}

export function subscribeContacts(onData, onError) {
  return listen('contacts', toList, onData, onError);
}

export async function addContact(clean) {
  const { db, ref, get, push } = sdk();
  const listSnap = await get(ref(db, 'contacts'));
  const existing = toList(listSnap.val());
  const isPrimary = existing.length === 0;
  await push(ref(db, 'contacts'), {
    name: clean.name,
    phone: clean.phone,
    isPrimary,
  });
}

export async function updateContact(id, clean) {
  const { db, ref, get, update } = sdk();
  const contactRef = ref(db, `contacts/${id}`);
  const snap = await get(contactRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Contact not found.');
  await update(contactRef, { name: clean.name, phone: clean.phone });
}

export async function deleteContact(id) {
  const { db, ref, get, remove } = sdk();
  const contactRef = ref(db, `contacts/${id}`);
  const snap = await get(contactRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Contact not found.');
  await remove(contactRef);
}

export async function setPrimary(id) {
  const { db, ref, get, update } = sdk();
  const listSnap = await get(ref(db, 'contacts'));
  const existing = toList(listSnap.val());
  if (!existing.some((c) => c.id === id)) throw new ServiceError('NOT_FOUND', 'Contact not found.');
  const patch = {};
  existing.forEach((c) => {
    patch[`contacts/${c.id}/isPrimary`] = c.id === id;
  });
  await update(ref(db), patch);
}

export function subscribeNotifications(onData, onError) {
  return listen('notifications', toList, onData, onError);
}

export async function markRead(id) {
  const { db, ref, get, update } = sdk();
  const nRef = ref(db, `notifications/${id}`);
  const snap = await get(nRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Notification not found.');
  await update(nRef, { read: true });
}

export async function markAllRead() {
  const { db, ref, get, update } = sdk();
  const list = toList((await get(ref(db, 'notifications'))).val());
  if (!list.length) return;
  const patch = {};
  list.forEach((n) => {
    patch[`notifications/${n.id}/read`] = true;
  });
  await update(ref(db), patch);
}

export async function clearAll() {
  const { db, ref, set } = sdk();
  await set(ref(db, 'notifications'), null);
}

export function subscribeSettings(onData, onError) {
  return listen(
    'settings',
    (val) =>
      val || {
        accidentThreshold: null,
        notifications: { push: true, sound: true },
      },
    onData,
    onError
  );
}

export async function updateSettings(patch) {
  const { db, ref, get, update } = sdk();
  const current =
    (await get(ref(db, 'settings'))).val() || {
      accidentThreshold: null,
      notifications: { push: true, sound: true },
    };
  await update(ref(db, 'settings'), {
    ...current,
    notifications: { ...current.notifications, ...(patch?.notifications || {}) },
  });
}

export async function saveFcmToken(token, platform) {
  if (!token) return;
  const { db, ref, set } = sdk();
  const safeId = String(token).replace(/[.#$[\]]/g, '_');
  await set(ref(db, `fcmTokens/${safeId}`), {
    token,
    platform: platform || 'unknown',
    updatedAt: new Date().toISOString(),
  });
}

export { DEVICE_ID };
