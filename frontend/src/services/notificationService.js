import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DATA_SOURCE } from '../config.js';

let tapHandler = null;
let responseSubscription = null;
let notificationsModule = null;

function getNotifications() {
  if (!notificationsModule) {
    notificationsModule = require('expo-notifications');
    notificationsModule.setNotificationHandler({
      handleNotification: async (notification) => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: notification.request.content.sound != null,
        shouldSetBadge: true,
      }),
    });
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
  if (Constants.expoGoConfig) {
    return { available: false, reason: 'Remote push notifications require a development build.' };
  }

  const Notifications = getNotifications();

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
  if (Constants.expoGoConfig) return { available: false, status: 'unavailable' };
  const Notifications = getNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  return {
    available: true,
    status: permissions.granted || permissions.status === 'granted' ? 'granted' : 'denied',
  };
}
