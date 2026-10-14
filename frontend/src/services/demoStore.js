import { buildInitialState, buildScenario } from '../data/mockData.js';

// In-memory store used in DEMO mode only. Lives for as long as the app runs, so
// adding a contact or resolving an alert really updates the app during a demo.
// Nothing here talks to Firebase or hardware.

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
