// DEMO DATA ONLY. Everything here is simulated and must never be shown as a real
// helmet reading. The app shows a "Demo" badge whenever dataSource === 'demo'.
// Live data comes from Supabase through a different code path.

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Scenarios you can switch between from the demo controls (useDemoControls).
export const SCENARIOS = [
  'normal',            // connected, GPS fix, no active alert
  'newAlert',          // active accident: red card, accident notification
  'gpsUnavailable',    // connected but no GPS fix (searching)
  'gpsStale',          // last GPS fix is 12 minutes old
  'offline',           // helmet silent for 2 minutes
  'sensorFault',       // MPU6050 not responding
  'gsmUnregistered',   // SIM800L not registered on the network
  'backendUnreachable',// app cannot reach the backend
  'batterySupported',  // pretend battery monitoring exists (shows a percentage)
  'emptyDevice',       // initial state from the brief: everything null
];

// Initial device state exactly as in the brief: nothing known yet.
export function emptyDevice() {
  return {
    id: 'HELMET_001',
    deviceId: 'HELMET_001',
    deviceName: 'Kavach Smart Helmet',
    helmetStatus: 'disconnected',
    accidentStatus: 'normal',
    latitude: null,
    longitude: null,
    gpsValid: false,
    gpsLastFixAt: null,
    gsmRegistered: false,
    mpuOk: null,
    batteryLevel: null,
    alcoholDetected: null,
    lastUpdated: null,
  };
}

function healthyDevice() {
  return {
    id: 'HELMET_001',
    deviceId: 'HELMET_001',
    deviceName: 'Kavach Smart Helmet',
    helmetStatus: 'connected',
    accidentStatus: 'normal',
    latitude: 28.6692,
    longitude: 77.4538,
    gpsValid: true,
    gpsLastFixAt: iso(5 * 1000),
    gsmRegistered: true,
    mpuOk: true,
    batteryLevel: null,    // battery monitoring is not implemented in hardware
    alcoholDetected: null, // reserved for a future alcohol sensor
    lastUpdated: iso(2 * 1000),
  };
}

function baseAlerts() {
  return [
    { id: 'a7', timestamp: iso(2 * DAY + 3 * HOUR), severity: 'medium', latitude: 28.6601, longitude: 77.4412, gpsValid: true,  status: 'resolved', smsStatus: 'confirmed' },
    { id: 'a6', timestamp: iso(4 * DAY),            severity: 'low',    latitude: null,    longitude: null,    gpsValid: false, status: 'resolved', smsStatus: 'unknown' },
    { id: 'a5', timestamp: iso(6 * DAY + 5 * HOUR), severity: 'high',   latitude: 28.6755, longitude: 77.4621, gpsValid: true,  status: 'resolved', smsStatus: 'confirmed' },
    { id: 'a4', timestamp: iso(9 * DAY),            severity: 'medium', latitude: 28.6488, longitude: 77.4310, gpsValid: true,  status: 'sent',     smsStatus: 'failed' },
    { id: 'a3', timestamp: iso(13 * DAY),           severity: 'low',    latitude: 28.6702, longitude: 77.4490, gpsValid: true,  status: 'sent',     smsStatus: 'unknown' },
    { id: 'a2', timestamp: iso(20 * DAY),           severity: 'high',   latitude: 28.6811, longitude: 77.4705, gpsValid: true,  status: 'resolved', smsStatus: 'confirmed' },
    { id: 'a1', timestamp: iso(31 * DAY),           severity: 'medium', latitude: null,    longitude: null,    gpsValid: false, status: 'resolved', smsStatus: 'failed' },
  ];
}

function activeAlert() {
  return {
    id: 'a8', timestamp: iso(40 * 1000), severity: 'high',
    latitude: 28.6692, longitude: 77.4538, gpsValid: true,
    status: 'new', smsStatus: 'pending',
  };
}

function baseNotifications() {
  return [
    { id: 'n8', type: 'alertUpdate',  title: 'Alert resolved',        body: 'The alert from 2 days ago was marked as resolved.',          timestamp: iso(2 * DAY),            read: true  },
    { id: 'n7', type: 'sensor',       title: 'Sensor warning',        body: 'The MPU6050 sensor did not respond for a short time.',       timestamp: iso(1 * DAY + 2 * HOUR), read: true  },
    { id: 'n6', type: 'gps',          title: 'GPS signal lost',       body: 'No valid GPS fix was available for 6 minutes.',              timestamp: iso(1 * DAY + 6 * HOUR), read: false },
    { id: 'n5', type: 'disconnected', title: 'Helmet disconnected',   body: 'The helmet stopped sending updates.',                        timestamp: iso(3 * DAY),            read: false },
    { id: 'n4', type: 'alertUpdate',  title: 'SMS delivery failed',   body: 'The emergency SMS for an earlier alert could not be sent.',  timestamp: iso(9 * DAY),            read: true  },
    { id: 'n3', type: 'accident',     title: 'Accident detected',     body: 'A possible accident was detected. Check the alert details.', timestamp: iso(9 * DAY + 5 * MIN),  read: true  },
    { id: 'n2', type: 'gps',          title: 'GPS location outdated', body: 'The last known location is more than 5 minutes old.',        timestamp: iso(13 * DAY),           read: true  },
    { id: 'n1', type: 'disconnected', title: 'Helmet disconnected',   body: 'The helmet stopped sending updates.',                        timestamp: iso(20 * DAY),           read: true  },
  ];
}

function baseContacts() {
  // Obviously fake numbers. Real contacts are entered by the user and stored in the backend.
  return [
    { id: 'c1', name: 'Demo Contact A', phone: '+919999900001', isPrimary: true },
    { id: 'c2', name: 'Demo Contact B', phone: '+919999900002', isPrimary: false },
    { id: 'c3', name: 'Demo Contact C', phone: '+919999900003', isPrimary: false },
  ];
}

function baseSettings() {
  return {
    accidentThreshold: null, // not configurable from the app yet -> UI shows "Unavailable"
    notifications: { push: true, sound: true },
  };
}

// Build the device/alerts/notifications/app part of the state for a scenario.
// Contacts and settings are kept by the store across scenario changes.
export function buildScenario(name = 'normal') {
  let device = healthyDevice();
  let alerts = baseAlerts();
  let notifications = baseNotifications();
  const app = { dataSource: 'demo', backendReachable: null };

  switch (name) {
    case 'newAlert':
      device.accidentStatus = 'alert';
      alerts = [activeAlert(), ...alerts];
      notifications = [
        { id: 'n9', type: 'accident', title: 'Accident detected', body: 'A possible accident was detected. Check the alert now.', timestamp: iso(40 * 1000), read: false },
        ...notifications,
      ];
      break;
    case 'gpsUnavailable':
      device = { ...device, latitude: null, longitude: null, gpsValid: false, gpsLastFixAt: null };
      break;
    case 'gpsStale':
      device.gpsLastFixAt = iso(12 * MIN);
      break;
    case 'offline':
      device.lastUpdated = iso(2 * MIN);
      device.gpsLastFixAt = iso(2 * MIN + 5 * 1000);
      break;
    case 'sensorFault':
      device.mpuOk = false;
      device.accidentStatus = 'warning';
      break;
    case 'gsmUnregistered':
      device.gsmRegistered = false;
      break;
    case 'backendUnreachable':
      app.backendReachable = false;
      device.lastUpdated = iso(4 * MIN);
      device.gpsLastFixAt = iso(4 * MIN + 5 * 1000);
      break;
    case 'batterySupported':
      device.batteryLevel = 78;
      break;
    case 'emptyDevice':
      device = emptyDevice();
      alerts = [];
      notifications = [];
      break;
    case 'normal':
    default:
      break;
  }
  return { device, alerts, notifications, app, scenario: name };
}

export function buildInitialState() {
  return {
    ...buildScenario('normal'),
    contacts: baseContacts(),
    settings: baseSettings(),
  };
}
