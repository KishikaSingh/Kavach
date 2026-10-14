import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { googleMapsUrl, hasValidCoordinates } from '../utils/mapLinks.js';
import { colors, space, type } from './person2Theme.js';

const GPS_COPY = {
  available: 'GPS available',
  searching: 'Searching for GPS…',
  unavailable: 'GPS unavailable',
  stale: 'Last GPS fix is outdated',
};

export function LocationPreview({
  latitude,
  longitude,
  gpsValid,
  gpsStatus,
  compact = false,
  timestampLabel,
  onOpenMaps,
}) {
  const point = { latitude, longitude, gpsValid };
  const usable = hasValidCoordinates(point);
  const statusText = GPS_COPY[gpsStatus] || (usable ? GPS_COPY.available : GPS_COPY.unavailable);

  const openMaps = async () => {
    if (onOpenMaps) {
      onOpenMaps();
      return;
    }
    const url = googleMapsUrl(latitude, longitude);
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  return (
    <View
      style={[styles.card, compact && styles.compact]}
      accessibilityRole="summary"
      accessibilityLabel={
        usable
          ? `${statusText}. Latitude ${latitude}, longitude ${longitude}.`
          : `${statusText}. Coordinates are hidden because GPS is not valid.`
      }
    >
      <Text style={type.label}>LOCATION</Text>
      <Text style={[type.subtitle, styles.status]}>{statusText}</Text>
      {usable ? (
        <Text style={type.body}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      ) : (
        <Text style={type.muted}>
          No map marker is shown. The app never displays a position unless GPS is valid.
        </Text>
      )}
      {timestampLabel ? <Text style={[type.muted, styles.meta]}>{timestampLabel}</Text> : null}
      <Pressable
        onPress={usable ? openMaps : undefined}
        disabled={!usable}
        accessibilityRole="button"
        accessibilityState={{ disabled: !usable }}
        accessibilityLabel={usable ? 'Open location in Google Maps' : 'Open in Maps unavailable'}
        accessibilityHint={usable ? 'Opens this coordinate in Google Maps' : 'GPS is not valid so Maps cannot open'}
        style={[styles.mapsBtn, !usable && styles.mapsBtnDisabled]}
      >
        <Text style={styles.mapsText}>{usable ? 'Open in Google Maps' : 'Open in Maps (unavailable)'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
  },
  compact: { padding: space.sm },
  status: { marginTop: 4, marginBottom: space.sm },
  meta: { marginTop: space.xs },
  mapsBtn: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  mapsBtnDisabled: { backgroundColor: colors.cardAlt },
  mapsText: { color: colors.text, fontWeight: '700' },
});
