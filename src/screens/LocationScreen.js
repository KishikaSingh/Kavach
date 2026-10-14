// Location tab: where the HELMET last reported its GPS position.
// This is the helmet's GPS, never the phone's location.
// A position is shown only when the helmet reports a valid fix.
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import DemoBadge from '../components/DemoBadge';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';

import useDevice from '../hooks/useDevice';
import useAlerts from '../hooks/useAlerts';

import {
  colors,
  getTone,
  radius,
  shadows,
  spacing,
  typography,
  MIN_TOUCH,
} from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import {
  formatCoord,
  getGpsState,
  GPS_LABELS,
  hasValidCoords,
  severityTone,
} from '../utils/deviceStatus';

const BANNERS = {
  available: {
    icon: 'checkmark-circle',
    tone: 'green',
    text: 'Live GPS fix received from the helmet.',
  },
  stale: {
    icon: 'time',
    tone: 'orange',
    text: 'The last GPS fix is over 5 minutes old. The helmet may have moved.',
  },
  searching: {
    icon: 'search',
    tone: 'orange',
    text: 'The helmet is connected but has no valid GPS fix yet.',
  },
  unavailable: {
    icon: 'cloud-offline',
    tone: 'grey',
    text: 'The helmet is offline, so no location is available.',
  },
};

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function LocationScreen({ navigation }) {
  const { device, dataSource, loading, error, refresh } = useDevice();
  const { alerts } = useAlerts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Latest 5 alerts, newest first.
  const recent = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5),
    [alerts]
  );

  if (loading && !device) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  if (error && !device) {
    return (
      <ScreenContainer>
        <ErrorState
          message={String(error.message || error)}
          onRetry={onRefresh}
        />
      </ScreenContainer>
    );
  }

  const gpsState = getGpsState(device);
  const gps = GPS_LABELS[gpsState];
  const banner = BANNERS[gpsState];
  const bannerTone = getTone(banner.tone);
  const valid = hasValidCoords(device);
  const connected = device?.helmetStatus === 'connected';
  const pinColor = gpsState === 'stale' ? colors.orange : colors.red;

  const isLast = (i) => i === recent.length - 1;
  const coordText = (a) =>
    `${formatCoord(a.latitude)}, ${formatCoord(a.longitude)}`;
  const openAlert = (id) =>
    navigation.navigate('AlertDetails', { alertId: id });

  const openMaps = async () => {
    const point = `${device.latitude},${device.longitude}`;
    const url = `https://www.google.com/maps?q=${point}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Unable to open maps', 'No app could open this location.');
    }
  };

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.title}>Helmet location</Text>
        <StatusBadge label={gps.label} tone={gps.tone} />
      </View>
      {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

      <View style={[styles.banner, { backgroundColor: bannerTone.bg }]}>
        <Ionicons name={banner.icon} size={20} color={bannerTone.fg} />
        <Text style={styles.bannerText}>{banner.text}</Text>
      </View>

      <View style={[styles.card, shadows.card]}>
        {valid ? (
          <>
            <View style={styles.mapBox} accessibilityLabel="Helmet position">
              {[25, 50, 75].map((p) => (
                <View key={`h${p}`} style={[styles.lineH, { top: `${p}%` }]} />
              ))}
              {[25, 50, 75].map((p) => (
                <View key={`v${p}`} style={[styles.lineV, { left: `${p}%` }]} />
              ))}
              <Ionicons name="location-sharp" size={48} color={pinColor} />
            </View>
            <AppButton
              title="Open in maps"
              icon="map-outline"
              onPress={openMaps}
              style={styles.btn}
            />
          </>
        ) : (
          <EmptyState
            icon="location-outline"
            title="No valid GPS location"
            message="No map is shown until the helmet reports a valid GPS fix."
          />
        )}
      </View>

      <Text style={styles.section}>Position details</Text>
      <View style={[styles.card, shadows.card]}>
        <Row label="Latitude" value={formatCoord(device?.latitude)} />
        <Row label="Longitude" value={formatCoord(device?.longitude)} />
        <Row label="Last GPS fix" value={timeAgo(device?.gpsLastFixAt)} />
        <Row
          label="Last communication"
          value={timeAgo(device?.lastUpdated)}
        />
        <Row
          label="Helmet"
          value={connected ? 'Connected' : 'Disconnected'}
          last
        />
        {!valid && device?.latitude != null ? (
          <Text style={styles.warn}>
            These coordinates are not a valid GPS fix, so they are not mapped.
          </Text>
        ) : null}
      </View>

      <Text style={styles.section}>Recent alert locations</Text>
      <View style={[styles.card, shadows.card]}>
        {recent.length === 0 ? (
          <Text style={styles.help}>No alerts yet.</Text>
        ) : (
          recent.map((a, i) => {
            const tone = getTone(severityTone(a.severity));
            return (
              <Pressable
                key={a.id}
                onPress={() => openAlert(a.id)}
                accessibilityRole="button"
                style={[styles.alertRow, !isLast(i) && styles.divider]}
              >
                <View style={[styles.dot, { backgroundColor: tone.fg }]} />
                <View style={styles.flex}>
                  <Text style={styles.rowValue}>
                    {formatDateTime(a.timestamp)}
                  </Text>
                  <Text style={styles.help}>
                    {hasValidCoords(a)
                      ? coordText(a)
                      : 'No valid GPS fix'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.grey}
                />
              </Pressable>
            );
          })
        )}
      </View>

      <Text style={styles.note}>
        This is the helmet's GPS position, not your phone's location.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.title },
  demo: { marginTop: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
    marginLeft: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  mapBox: {
    height: 200,
    borderRadius: radius.md,
    backgroundColor: '#DCE8F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#C3D4EC',
  },
  lineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#C3D4EC',
  },
  btn: { marginTop: spacing.md },
  section: {
    ...typography.heading,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.navy },
  warn: { fontSize: 12, color: colors.orange, marginTop: spacing.sm },
  help: { fontSize: 12, color: colors.muted, marginTop: 2 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 8,
    paddingVertical: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  note: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});