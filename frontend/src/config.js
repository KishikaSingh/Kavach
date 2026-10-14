// Data source switch. Set EXPO_PUBLIC_DATA_SOURCE=live in .env to use Firebase (Phase 3).
// Anything else (or unset) means demo mode: in-memory mock data, no Firebase, no hardware.
export const DATA_SOURCE =
  process.env.EXPO_PUBLIC_DATA_SOURCE === 'live' ? 'live' : 'demo';

// The helmet counts as disconnected if it has not reported for this long.
export const DISCONNECT_AFTER_MS = 30 * 1000;

// A GPS fix older than this is "stale" (location may be outdated).
export const GPS_STALE_AFTER_MS = 5 * 60 * 1000;
