// Map helpers shared by Person 1 and Person 2.

// True only when we hold a genuinely valid position. Never draw a marker otherwise.
export function hasValidCoordinates(device) {
  return (
    !!device &&
    device.gpsValid === true &&
    typeof device.latitude === 'number' &&
    typeof device.longitude === 'number' &&
    Math.abs(device.latitude) <= 90 &&
    Math.abs(device.longitude) <= 180
  );
}

// Google Maps link for a coordinate pair, or null when coordinates are unusable.
export function googleMapsUrl(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
