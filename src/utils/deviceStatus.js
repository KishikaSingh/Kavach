import { DISCONNECT_AFTER_MS, GPS_STALE_AFTER_MS } from '../config.js';
import { ageMs } from './formatTime.js';

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
