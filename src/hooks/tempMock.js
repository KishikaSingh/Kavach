// TEMP (Person 1): demo data in the shared-contract schema. Replaced by Person 3's
// src/data/mockData.js. Everything here is DEMO data, never real readings.
const ago = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

export const mockDevice = {
  deviceId: 'HELMET_001',
  helmetStatus: 'connected',
  accidentStatus: 'normal',
  latitude: 28.6692,
  longitude: 77.4538,
  gpsValid: true,
  gpsLastFixAt: ago(2),
  gsmRegistered: true,
  mpuOk: true,
  batteryLevel: null, // not supported yet
  alcoholDetected: null, // reserved
  lastUpdated: ago(1),
};

export const mockAlerts = [
  { id: 'a1', timestamp: ago(60 * 20), severity: 'high', latitude: 28.6702, longitude: 77.4521, gpsValid: true, status: 'resolved', smsStatus: 'confirmed' },
  { id: 'a2', timestamp: ago(60 * 24 * 3), severity: 'medium', latitude: 28.6655, longitude: 77.4602, gpsValid: true, status: 'sent', smsStatus: 'unknown' },
  { id: 'a3', timestamp: ago(60 * 24 * 6), severity: 'low', latitude: null, longitude: null, gpsValid: false, status: 'resolved', smsStatus: 'failed' },
];

export const mockContacts = [
  { id: 'c1', name: 'Asha', phone: '+919876543210', isPrimary: true },
  { id: 'c2', name: 'Rahul', phone: '+919812345678', isPrimary: false },
];

export const mockNotifications = [
  { id: 'n1', type: 'accident', title: 'Accident alert', body: 'High severity impact detected.', timestamp: ago(60 * 20), read: false, alertId: 'a1' },
  { id: 'n2', type: 'gps', title: 'GPS signal weak', body: 'No valid GPS fix for a few minutes.', timestamp: ago(60 * 5), read: false },
  { id: 'n3', type: 'disconnected', title: 'Helmet disconnected', body: 'The helmet stopped reporting.', timestamp: ago(60 * 30), read: true },
  { id: 'n4', type: 'alertUpdate', title: 'Alert resolved', body: 'An alert was marked as resolved.', timestamp: ago(60 * 19), read: true, alertId: 'a1' },
];

export const mockSettings = {
  accidentThreshold: null, // not supported yet
  notifications: { push: true, sound: true },
};
