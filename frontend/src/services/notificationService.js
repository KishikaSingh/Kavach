import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DATA_SOURCE } from '../config.js';

let tapHandler = null;
let responseSubscription = null;

// expo-notifications is loaded lazily: Expo Go does not ship its native module, and a top-level import
// would crash the whole app at start-up ("Cannot find native module ..."). Push works in the built APK.
let notificationsModule;
function loadNotifications() {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = require('expo-notifications');
    notificationsModule.setNotificationHandler({
      handleNotification: async (notification) => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: notification.request.content.sound != null,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn('expo-notifications is not available in this app build; push notifications are disabled.', error?.message || error);
    notificationsModule = null;
  }
  return notificationsModule;
}

export function setAccidentAlertTapHandler(handler) {
  tapHandler = typeof handler === 'function' ? handler : null;
}

function handleNotificationResponse(response) {
  const data = response?.notification?.request?.content?.data;
  if (data?.type === 'accident' && data.alertId && tapHandler) {
    tapHandler({ alertId: String(data.alertId), type: 'accident' });
  }
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
}

export async function initPushNotifications({ onAccidentAlertTap } = {}) {
  if (DATA_SOURCE !== 'live') {
    return { available: false, reason: 'Remote push notifications require live mode.' };
  }
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return { available: false, reason: `Remote push notifications are not supported on ${Platform.OS}.` };
  }

  const Notifications = loadNotifications();
  if (!Notifications) {
    return { available: false, reason: 'Push notifications are not supported in this build (for example Expo Go). Use the APK.' };
  }

  if (onAccidentAlertTap) setAccidentAlertTapHandler(onAccidentAlertTap);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Emergency alerts',
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D32F2F',
    });
  }

  if (responseSubscription) responseSubscription.remove();
  responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
  handleNotificationResponse(await Notifications.getLastNotificationResponseAsync());

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('EAS project ID is missing. Set EXPO_PUBLIC_EAS_PROJECT_ID before enabling live push notifications.');
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    return { available: true, permission: 'denied', token: null };
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { saveExpoPushToken } = require('./firebaseService.js');
  await saveExpoPushToken(token, Platform.OS);

  return { available: true, permission: 'granted', token };
}

export function stopPushNotifications() {
  if (responseSubscription) responseSubscription.remove();
  responseSubscription = null;
  tapHandler = null;
}

export async function getPushPermissionStatus() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return { available: false, status: 'unavailable' };
  }
  const Notifications = loadNotifications();
  if (!Notifications) return { available: false, status: 'unavailable' };
  const permissions = await Notifications.getPermissionsAsync();
  return {
    available: true,
    status: permissions.granted || permissions.status === 'granted' ? 'granted' : 'denied',
  };
}
