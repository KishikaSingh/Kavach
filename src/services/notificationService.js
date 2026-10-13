import { Platform } from 'react-native';

// Push permission, token registration, and tap handling.
// This is not the in-app inbox (that is Person 3's inboxService / useNotifications).
// Screens should not import this. Person 1 should call initPushNotifications from App.

function loadExpoNotifications() {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

let tapHandler = null;
let responseSub = null;
let receiveSub = null;

export function setAccidentAlertTapHandler(handler) {
  tapHandler = typeof handler === 'function' ? handler : null;
}

function handleData(data) {
  if (!data || data.type !== 'accident' || !data.alertId) return;
  if (tapHandler) tapHandler({ alertId: data.alertId, type: 'accident' });
}

export async function initPushNotifications({ onAccidentAlertTap } = {}) {
  if (onAccidentAlertTap) setAccidentAlertTapHandler(onAccidentAlertTap);

  const Notifications = loadExpoNotifications();
  if (!Notifications) {
    return {
      available: false,
      reason: 'expo-notifications is not installed yet. Add it when Person 1 scaffolds Expo.',
    };
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const permissions = await Notifications.requestPermissionsAsync();
  const granted = permissions.granted || permissions.status === 'granted';
  if (!granted) {
    return { available: true, permission: 'denied', token: null };
  }

  let token = null;
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    token = result?.data || null;
  } catch {
    token = null;
  }

  if (token) {
    try {
      const { saveFcmToken } = require('./firebaseService.js');
      await saveFcmToken(token, Platform.OS);
    } catch {
      // Demo mode or Firebase not connected: keep the local token anyway.
    }
  }

  if (responseSub) responseSub.remove();
  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data;
    handleData(data);
  });

  if (receiveSub) receiveSub.remove();
  receiveSub = Notifications.addNotificationReceivedListener(() => {});

  return { available: true, permission: 'granted', token };
}

export function stopPushNotifications() {
  if (responseSub) responseSub.remove();
  if (receiveSub) receiveSub.remove();
  responseSub = null;
  receiveSub = null;
}

export async function getPushPermissionStatus() {
  const Notifications = loadExpoNotifications();
  if (!Notifications) return { available: false, status: 'unavailable' };
  const permissions = await Notifications.getPermissionsAsync();
  return {
    available: true,
    status: permissions.granted || permissions.status === 'granted' ? 'granted' : 'denied',
  };
}
