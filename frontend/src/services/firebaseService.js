import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ServiceError } from './serviceError.js';

// Live backend for liveAdapter. Demo mode never loads the Firebase SDK.
const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || 'HELMET_001';
const DEFAULT_SETTINGS = {
  accidentThreshold: null,
  notifications: { push: true, sound: true },
};

let cached = null;
let signInPromise = null;

function firebaseConfig() {
  const databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!databaseURL || !apiKey || !projectId) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      'Live mode is missing Firebase environment variables. See backend/firebase/SETUP.md.'
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
  let authMod;
  try {
    appMod = require('firebase/app');
    dbMod = require('firebase/database');
    authMod = require('firebase/auth');
  } catch (error) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      `Firebase SDK could not be loaded: ${error.message || error}`
    );
  }

  const app = appMod.getApps().length
    ? appMod.getApp()
    : appMod.initializeApp(firebaseConfig());
  let auth;
  if (Platform.OS === 'web') {
    auth = authMod.getAuth(app);
  } else {
    try {
      auth = authMod.initializeAuth(app, {
        persistence: authMod.getReactNativePersistence(AsyncStorage),
      });
    } catch (error) {
      if (error.code !== 'auth/already-initialized') throw error;
      auth = authMod.getAuth(app);
    }
  }

  cached = {
    app,
    auth,
    db: dbMod.getDatabase(app),
    ref: dbMod.ref,
    onValue: dbMod.onValue,
    get: dbMod.get,
    set: dbMod.set,
    update: dbMod.update,
    push: dbMod.push,
    runTransaction: dbMod.runTransaction,
    remove: dbMod.remove,
    signInAnonymously: authMod.signInAnonymously,
    onAuthStateChanged: authMod.onAuthStateChanged,
  };
  return cached;
}

async function ensureAuthenticated() {
  const backend = sdk();
  if (backend.auth.currentUser) return backend.auth.currentUser;
  const currentUser = await new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = backend.onAuthStateChanged(
      backend.auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
  if (currentUser) return currentUser;
  if (!signInPromise) {
    signInPromise = backend.signInAnonymously(backend.auth)
      .then((credential) => credential.user)
      .finally(() => {
        signInPromise = null;
      });
  }
  return signInPromise;
}

export async function getFirebaseUserId() {
  const user = await ensureAuthenticated();
  return user.uid;
}

async function userPath(...parts) {
  const user = await ensureAuthenticated();
  return [`users/${user.uid}`, ...parts].join('/');
}

function toList(snapshotVal) {
  if (!snapshotVal) return [];
  return Object.entries(snapshotVal).map(([id, value]) => ({ id, ...(value || {}) }));
}

function listen(path, mapValue, onData, onError) {
  let unsubscribe = () => {};
  let cancelled = false;
  ensureAuthenticated()
    .then(() => {
      if (cancelled) return;
      const { db, ref, onValue } = sdk();
      unsubscribe = onValue(
        ref(db, path),
        (snap) => {
          try {
            onData(mapValue(snap.val()));
          } catch (error) {
            if (onError) onError(error);
            else console.error(`Firebase listener failed for ${path}`, error);
          }
        },
        (error) => {
          if (onError) onError(error);
          else console.error(`Firebase subscription failed for ${path}`, error);
        }
      );
    })
    .catch((error) => {
      if (onError) onError(error);
      else console.error(`Firebase authentication failed for ${path}`, error);
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export function subscribeDevice(onData, onError) {
  return listen(`devices/${DEVICE_ID}`, (value) => value || null, onData, onError);
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
  await ensureAuthenticated();
  await get(ref(db, `devices/${DEVICE_ID}`));
}

export function subscribeAlerts(onData, onError) {
  return listen(`alerts/${DEVICE_ID}`, toList, onData, onError);
}

export async function refreshAlerts() {
  const { db, ref, get } = sdk();
  await ensureAuthenticated();
  await get(ref(db, `alerts/${DEVICE_ID}`));
}

export async function resolveAlert(id) {
  const { db, ref, get, update, push, set } = sdk();
  const alertPath = `alerts/${DEVICE_ID}/${id}`;
  const alertRef = ref(db, alertPath);
  await ensureAuthenticated();
  const snap = await get(alertRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Alert not found.');
  if (snap.val()?.status === 'resolved') return;

  await update(ref(db), { [`${alertPath}/status`]: 'resolved' });
  const notificationRef = push(ref(db, await userPath('notifications')));
  await set(notificationRef, {
    type: 'alertUpdate',
    title: 'Alert resolved',
    body: 'You marked an accident alert as resolved.',
    timestamp: new Date().toISOString(),
    read: false,
    alertId: String(id),
    deviceId: DEVICE_ID,
  });
}

export function subscribeContacts(onData, onError) {
  return subscribeUserPath('contacts', onData, onError);
}

function subscribeUserPath(collection, onData, onError, mapValue = toList) {
  let unsubscribe = () => {};
  let cancelled = false;
  userPath(collection)
    .then((path) => {
      if (!cancelled) unsubscribe = listen(path, mapValue, onData, onError);
    })
    .catch((error) => {
      if (onError) onError(error);
      else console.error(`Firebase path setup failed for ${collection}`, error);
    });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function addContact(clean) {
  const { db, ref, push, runTransaction } = sdk();
  const path = await userPath('contacts');
  const contactsRef = ref(db, path);
  const newContactRef = push(contactsRef);
  const result = await runTransaction(contactsRef, (contacts) => {
    const current = contacts || {};
    const isPrimary = !Object.values(current).some((contact) => contact?.isPrimary === true);
    current[newContactRef.key] = { ...clean, isPrimary };
    return current;
  });
  if (!result.committed) throw new Error('Could not save the emergency contact.');
}

export async function updateContact(id, clean) {
  const { db, ref, get, update } = sdk();
  const contactRef = ref(db, await userPath('contacts', id));
  const snap = await get(contactRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Contact not found.');
  await update(contactRef, { name: clean.name, phone: clean.phone });
}

export async function deleteContact(id) {
  const { db, ref, get, update } = sdk();
  const path = await userPath('contacts');
  const contacts = toList((await get(ref(db, path))).val());
  const removed = contacts.find((contact) => contact.id === id);
  if (!removed) throw new ServiceError('NOT_FOUND', 'Contact not found.');

  const remaining = contacts.filter((contact) => contact.id !== id);
  const patch = { [`${path}/${id}`]: null };
  if (removed.isPrimary && remaining.length && !remaining.some((contact) => contact.isPrimary)) {
    patch[`${path}/${remaining[0].id}/isPrimary`] = true;
  }
  await update(ref(db), patch);
}

export async function setPrimary(id) {
  const { db, ref, get, update } = sdk();
  const path = await userPath('contacts');
  const listSnap = await get(ref(db, path));
  const existing = toList(listSnap.val());
  if (!existing.some((contact) => contact.id === id)) {
    throw new ServiceError('NOT_FOUND', 'Contact not found.');
  }
  const patch = {};
  existing.forEach((contact) => {
    patch[`${path}/${contact.id}/isPrimary`] = contact.id === id;
  });
  await update(ref(db), patch);
}

export function subscribeNotifications(onData, onError) {
  return subscribeUserPath('notifications', onData, onError);
}

export async function markRead(id) {
  const { db, ref, get, update } = sdk();
  const notificationRef = ref(db, await userPath('notifications', id));
  const snap = await get(notificationRef);
  if (!snap.exists()) throw new ServiceError('NOT_FOUND', 'Notification not found.');
  await update(notificationRef, { read: true });
}

export async function markAllRead() {
  const { db, ref, get, update } = sdk();
  const path = await userPath('notifications');
  const notifications = toList((await get(ref(db, path))).val());
  if (!notifications.length) return;
  const patch = {};
  notifications.forEach((notification) => {
    patch[`${path}/${notification.id}/read`] = true;
  });
  await update(ref(db), patch);
}

export async function clearAll() {
  const { db, ref, set } = sdk();
  await set(ref(db, await userPath('notifications')), null);
}

export function subscribeSettings(onData, onError) {
  return subscribeUserPath(
    'settings',
    onData,
    onError,
    (value) => ({
      ...DEFAULT_SETTINGS,
      ...(value || {}),
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(value?.notifications || {}) },
    })
  );
}

export async function updateSettings(patch) {
  if (!patch || typeof patch !== 'object' || 'accidentThreshold' in patch) {
    throw new ServiceError('UNSUPPORTED', 'The accident detection threshold cannot be changed from the app.');
  }
  const notifications = patch.notifications || {};
  const keys = Object.keys(notifications);
  if (keys.some((key) => !['push', 'sound'].includes(key)) ||
      keys.some((key) => typeof notifications[key] !== 'boolean')) {
    throw new ServiceError('INVALID_SETTINGS', 'Notification settings must use boolean push and sound values.');
  }
  if (!keys.length) return;

  const { db, ref, update } = sdk();
  const path = await userPath('settings');
  const changes = {};
  keys.forEach((key) => {
    changes[`${path}/notifications/${key}`] = notifications[key];
  });
  await update(ref(db), changes);
}

export async function saveExpoPushToken(token, platform) {
  if (!token) throw new ServiceError('INVALID_TOKEN', 'Cannot register an empty push token.');
  if (platform !== 'android' && platform !== 'ios') {
    throw new ServiceError('UNSUPPORTED_PLATFORM', `Push notifications are not supported on ${platform}.`);
  }
  const { db, ref, set } = sdk();
  const tokenId = Array.from(token, (character) => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  const tokenRef = ref(db, await userPath('pushTokens', tokenId));
  await set(tokenRef, { token, platform, updatedAt: new Date().toISOString() });
}

export { DEVICE_ID };
