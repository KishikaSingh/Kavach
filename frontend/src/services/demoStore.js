import { buildInitialState, buildScenario } from '../data/mockData.js';

// In-memory store used in DEMO mode only. Lives for as long as the app runs, so
// adding a contact or resolving an alert really updates the app during a demo.
// Nothing here talks to live backend services or hardware.

const SIMULATED_LATENCY_MS = 250; // so loading states are visible
const HEARTBEAT_MS = 5000;

// Scenarios in which the pretend helmet keeps reporting. In 'offline' and
// 'backendUnreachable' it stays silent so those states persist.
const HEARTBEAT_SCENARIOS = new Set([
  'normal', 'newAlert', 'gpsUnavailable', 'gpsStale', 'sensorFault', 'gsmUnregistered', 'batterySupported',
]);
// Scenarios in which the GPS fix keeps being refreshed too.
const FRESH_GPS_SCENARIOS = new Set([
  'normal', 'newAlert', 'sensorFault', 'gsmUnregistered', 'batterySupported',
]);

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

let state = buildInitialState();
const listeners = { device: new Set(), alerts: new Set(), contacts: new Set(), notifications: new Set(), settings: new Set(), app: new Set() };
let heartbeat = null;

function emit(key) {
  const snapshot = clone(state[key]);
  listeners[key].forEach((l) => l(snapshot));
}

function startHeartbeatIfNeeded() {
  if (heartbeat || listeners.device.size === 0) return;
  heartbeat = setInterval(() => beat(), HEARTBEAT_MS);
  if (heartbeat.unref) heartbeat.unref(); // do not keep Node alive in tests
}

function stopHeartbeatIfIdle() {
  if (heartbeat && listeners.device.size === 0) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

// Pretend the helmet just reported.
function beat() {
  if (!HEARTBEAT_SCENARIOS.has(state.scenario)) return;
  const now = new Date().toISOString();
  state.device.lastUpdated = now;
  if (FRESH_GPS_SCENARIOS.has(state.scenario) && state.device.gpsValid) {
    state.device.gpsLastFixAt = now;
  }
  emit('device');
}

export const demoStore = {
  get(key) {
    return clone(state[key]);
  },

  // Calls cb with the current value after a short simulated delay, then on every change.
  subscribe(key, cb) {
    const wrapped = (v) => cb(v);
    listeners[key].add(wrapped);
    const timer = setTimeout(() => {
      if (listeners[key].has(wrapped)) cb(clone(state[key]));
    }, SIMULATED_LATENCY_MS);
    if (key === 'device') startHeartbeatIfNeeded();
    return () => {
      clearTimeout(timer);
      listeners[key].delete(wrapped);
      if (key === 'device') stopHeartbeatIfIdle();
    };
  },

  set(key, value) {
    state[key] = clone(value);
    emit(key);
  },

  // Switch the pretend situation. Contacts and settings are kept.
  setScenario(name) {
    const next = buildScenario(name);
    state = { ...state, ...next };
    ['device', 'alerts', 'notifications', 'app'].forEach(emit);
  },

  getScenario() {
    return state.scenario;
  },

  // Granular telemetry controls for hardware-free simulation
  setBatteryLevel(level) {
    if (!state.device) return;
    state.device.batteryLevel = level != null ? Math.max(0, Math.min(100, Number(level))) : null;
    emit('device');
  },

  setConnectivity(connected) {
    if (!state.device) return;
    state.device.helmetStatus = connected ? 'connected' : 'disconnected';
    state.device.lastUpdated = new Date().toISOString();
    emit('device');
  },

  setGpsStatus(status) {
    if (!state.device) return;
    const now = new Date().toISOString();
    if (status === 'available') {
      state.device.gpsValid = true;
      state.device.latitude = state.device.latitude || 28.6692;
      state.device.longitude = state.device.longitude || 77.4538;
      state.device.gpsLastFixAt = now;
    } else if (status === 'stale') {
      state.device.gpsValid = true;
      state.device.latitude = state.device.latitude || 28.6692;
      state.device.longitude = state.device.longitude || 77.4538;
      state.device.gpsLastFixAt = new Date(Date.now() - 12 * 60 * 1000).toISOString();
    } else {
      state.device.gpsValid = false;
      state.device.latitude = null;
      state.device.longitude = null;
      state.device.gpsLastFixAt = null;
    }
    emit('device');
  },

  setSensorStatus({ mpuOk, gsmRegistered }) {
    if (!state.device) return;
    if (mpuOk !== undefined) state.device.mpuOk = mpuOk;
    if (gsmRegistered !== undefined) state.device.gsmRegistered = gsmRegistered;
    emit('device');
  },

  triggerSimulatedAccident({
    severity = 'high',
    latitude = 28.6692,
    longitude = 77.4538,
    gpsValid = true,
  } = {}) {
    const now = new Date().toISOString();
    const alertId = `sim_${Date.now()}`;
    const alert = {
      id: alertId,
      timestamp: now,
      severity,
      latitude: gpsValid ? latitude : null,
      longitude: gpsValid ? longitude : null,
      gpsValid: !!gpsValid,
      status: 'new',
      smsStatus: 'pending',
    };

    if (state.device) {
      state.device.accidentStatus = 'alert';
      state.device.lastUpdated = now;
      if (gpsValid) {
        state.device.gpsValid = true;
        state.device.latitude = latitude;
        state.device.longitude = longitude;
        state.device.gpsLastFixAt = now;
      }
    }

    state.alerts = [alert, ...(state.alerts || [])];
    state.notifications = [
      {
        id: `notif_${alertId}`,
        type: 'accident',
        title: 'Accident detected',
        body: `[Simulated] ${severity.toUpperCase()} impact detected at ${now.slice(11, 19)}.`,
        timestamp: now,
        read: false,
        alertId,
      },
      ...(state.notifications || []),
    ];

    emit('device');
    emit('alerts');
    emit('notifications');
    return alert;
  },

  async delay(ms = SIMULATED_LATENCY_MS) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  beat,

  // Test helper: back to the initial state.
  reset() {
    state = buildInitialState();
    Object.keys(listeners).forEach(emit);
  },
};
