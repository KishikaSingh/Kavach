import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { googleMapsUrl, hasValidCoordinates } from '../utils/mapLinks.js';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, spacing } from '../theme/index.js';

const GPS_COPY = {
  available: 'GPS available — live signal',
  searching: 'Searching for GPS fix…',
  unavailable: 'GPS unavailable',
  stale: 'Last GPS fix is outdated (> 5 min)',
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
  const { colors, isDark } = useTheme();
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
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        compact && styles.compact,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={
        usable
          ? `${statusText}. Latitude ${latitude}, longitude ${longitude}.`
          : `${statusText}. Coordinates are hidden because GPS is not valid.`
      }
    >
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Ionicons
            name={usable ? 'navigate' : 'navigate-outline'}
            size={14}
            color={usable ? colors.safetyTeal : colors.textMuted}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.headerLabel, { color: colors.safetyTeal }]}>HELMET GPS FIX</Text>
        </View>
        <Text style={[styles.statusTag, { color: usable ? colors.safetyTeal : colors.warning }]}>
          {usable ? 'ACTIVE FIX' : 'NO FIX'}
        </Text>
      </View>

      <Text style={[styles.statusText, { color: colors.text }]}>{statusText}</Text>

      {usable ? (
        <View style={[styles.coordBox, { backgroundColor: isDark ? colors.cardElevated : colors.softBlue, borderColor: colors.border }]}>
          <Text style={[styles.coordText, { color: colors.text }]}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>
      ) : (
        <Text style={[styles.mutedDesc, { color: colors.textSecondary }]}>
          No map marker is shown. The application displays coordinates only when a valid GPS fix is confirmed by the helmet.
        </Text>
      )}

      {timestampLabel ? (
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>{timestampLabel}</Text>
      ) : null}

      <Pressable
        onPress={usable ? openMaps : undefined}
        disabled={!usable}
        accessibilityRole="button"
        accessibilityState={{ disabled: !usable }}
        accessibilityLabel={usable ? 'Open location in Google Maps' : 'Open in Maps unavailable'}
        accessibilityHint={usable ? 'Opens this coordinate in Google Maps' : 'GPS is not valid so Maps cannot open'}
        style={[
          styles.mapsBtn,
          { backgroundColor: usable ? colors.safetyTeal : colors.mutedSurface },
          !usable && styles.mapsBtnDisabled,
        ]}
      >
        <Ionicons
          name="map-outline"
          size={16}
          color={usable ? colors.white : colors.textMuted}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.mapsText,
            { color: usable ? colors.white : colors.textMuted },
          ]}
        >
          {usable ? 'Open in Google Maps' : 'Open in Maps (Unavailable)'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  compact: {
    padding: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  coordBox: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
  coordText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mutedDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  mapsBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mapsBtnDisabled: {
    opacity: 0.7,
  },
  mapsText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default LocationPreview;
