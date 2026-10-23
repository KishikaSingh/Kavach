import { DATA_SOURCE } from '../config.js';
import { ServiceError } from './serviceError.js';

// Live Adapter for Kavach Smart Helmet.
// In live mode, requests are routed to the live backend service.
// Supabase is the sole authoritative backend.
let cachedBackend = null;

export function getLiveBackend() {
  if (!cachedBackend) {
    cachedBackend = require('./supabaseService.js');
  }
  return cachedBackend;
}

export function setLiveBackendForTesting(backend) {
  cachedBackend = backend;
}

export function resetLiveBackend() {
  if (cachedBackend && typeof cachedBackend.__resetManagers === 'function') {
    cachedBackend.__resetManagers();
  }
  cachedBackend = null;
}

// Returns the live backend, or null in demo mode. Throws in live mode if not connected.
export function liveBackend() {
  if (DATA_SOURCE !== 'live') return null;
  const backend = getLiveBackend();
  if (!backend) {
    throw new ServiceError(
      'LIVE_NOT_CONNECTED',
      'Live mode is on but the backend is not connected yet.'
    );
  }
  return backend;
}
