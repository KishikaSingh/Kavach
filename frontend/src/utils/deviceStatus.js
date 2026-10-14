// Pure helpers that turn the raw device object into display state. No simulated values:
// anything null stays "unknown".
import { isOlderThan, ageMs } from './formatTime';
import { DISCONNECT_AFTER_MS, GPS_STALE_AFTER_MS } from '../config.js';

export const GPS_STALE_MINUTES = 5;

// Map markers / coordinates are only shown when this is true (shared contract rule).
export function hasValidCoords(item) {
  return !!item && item.gpsValid === true && item.latitude != null && item.longitude != null;
}

// 'available' | 'stale' | 'searching' | 'unavailable'
export function getGpsState(device) {
  if (!device) return 'unavailable';
  if (hasValidCoords(device)) {
    // A valid fix with a missing or old timestamp is treated as stale, never as live.
    return isOlderThan(device.gpsLastFixAt, GPS_STALE_MINUTES) ? 'stale' : 'available';
  }
  return device.helmetStatus === 'connected' ? 'searching' : 'unavailable';
}

export const GPS_LABELS = {
  available: { label: 'Available', tone: 'green' },
  stale: { label: 'Stale', tone: 'orange' },
  searching: { label: 'Searching', tone: 'orange' },
  unavailable: { label: 'Unavailable', tone: 'grey' },
};

// SMS is only "delivered" when smsStatus === 'confirmed'.
export function smsLabel(smsStatus) {
  switch (smsStatus) {
    case 'confirmed':
      return { label: 'SMS delivered', tone: 'green' };
    case 'pending':
      return { label: 'SMS pending', tone: 'orange' };
    case 'failed':
      return { label: 'SMS failed', tone: 'red' };
    default:
      return { label: 'SMS status unknown', tone: 'grey' };
  }
}

export function severityTone(severity) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'orange';
  return 'grey';
}

export function formatCoord(value) {
  return value == null ? 'Not available' : Number(value).toFixed(5);
}

// Turns the raw device record into what screens should show.
// Rules from the brief:
//  - helmet is "disconnected" if it has not reported for 30 s (or never did);
//  - when gpsValid is false, coordinates must not be displayed -> set to null;
//  - GPS status is one of: available | searching | unavailable | stale.
// Adds: gpsStatus, gpsAgeMs, lastCommunicationAgeMs. Original raw fields are kept.
export function deriveDevice(raw, now = Date.now()) {
  if (!raw) return null;

  const commAge = ageMs(raw.lastUpdated, now);
  const online =
    raw.helmetStatus === 'connected' && commAge !== null && commAge <= DISCONNECT_AFTER_MS;

  const gpsAge = ageMs(raw.gpsLastFixAt, now);
  let gpsStatus;
  if (commAge === null) gpsStatus = 'unavailable'; // device never reported anything
  else if (raw.gpsValid !== true) gpsStatus = online ? 'searching' : 'unavailable';
  else if (gpsAge === null || gpsAge > GPS_STALE_AFTER_MS) gpsStatus = 'stale';
  else gpsStatus = 'available';

  const showCoords = raw.gpsValid === true;
  return {
    ...raw,
    helmetStatus: online ? 'connected' : 'disconnected',
    latitude: showCoords ? raw.latitude : null,
    longitude: showCoords ? raw.longitude : null,
    gpsStatus,
    gpsAgeMs: gpsAge,
    lastCommunicationAgeMs: commAge,
  };
}
