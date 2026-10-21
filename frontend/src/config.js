// Live data is the default. Set EXPO_PUBLIC_DATA_SOURCE=demo to opt into mock data.
export const DATA_SOURCE =
  process.env.EXPO_PUBLIC_DATA_SOURCE === 'demo' ? 'demo' : 'live';

// The helmet counts as disconnected if it has not reported for this long.
export const DISCONNECT_AFTER_MS = 30 * 1000;

// A GPS fix older than this is "stale" (location may be outdated).
export const GPS_STALE_AFTER_MS = 5 * 60 * 1000;
