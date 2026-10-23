module.exports = {
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => {},
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getLastNotificationResponseAsync: async () => null,
  getPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  requestPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[mock-token-123]' }),
  AndroidImportance: { MAX: 5 },
};
