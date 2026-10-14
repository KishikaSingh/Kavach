// Settings tab: device health + warnings + notification toggles.
// Unsupported items (accident threshold, battery) are labelled Unavailable / Coming soon, never faked.
import React, { useCallback, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import DeviceHealthCard from '../components/DeviceHealthCard';
import DemoBadge from '../components/DemoBadge';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';
import ProfileRow from '../components/ProfileRow';

import useDevice from '../hooks/useDevice';
import useSettings from '../hooks/useSettings';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import { getGpsState, GPS_LABELS } from '../utils/deviceStatus';

export default function DeviceSettingsScreen() {
  const { device, dataSource, backendReachable, loading, error, refresh } = useDevice();
  const { settings, updateSettings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  if (error && !device) {
    return (
      <ScreenContainer>
        <ErrorState message={String(error.message || error)} onRetry={onRefresh} />
      </ScreenContainer>
    );
  }
  if (loading && !device) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  const connected = device?.helmetStatus === 'connected';
  const gpsState = getGpsState(device);
  const gps = GPS_LABELS[gpsState];

  // Plain-language warnings, one per problem.
  const warnings = [];
  if (!connected) warnings.push('The helmet is offline. Readings below are the last reported values.');
  if (device?.mpuOk === false) warnings.push('The MPU6050 motion sensor is reporting a fault.');
  if (device?.mpuOk == null) warnings.push('MPU6050 status is not reported by the helmet.');
  if (gpsState === 'searching' || gpsState === 'unavailable') warnings.push('GPS data is missing. No valid fix has been received.');
  if (gpsState === 'stale') warnings.push('GPS data is outdated (last fix over 5 minutes ago).');
  if (device && device.gsmRegistered === false) warnings.push('The GSM module is not registered on a network, so SMS alerts cannot be sent.');
  if (backendReachable === false) warnings.push('The backend cannot be reached. Data may be out of date.');

  const backend = backendReachable === true ? { v: 'Reachable', t: 'green' } : backendReachable === false ? { v: 'Unreachable', t: 'red' } : { v: 'Not checked', t: 'grey' };

  const setNotif = (key) => (value) => updateSettings({ notifications: { [key]: value } });

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={styles.title}>Device status</Text>
      {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

      {warnings.length > 0 ? (
        <View style={styles.warnBox} accessibilityRole="alert">
          {warnings.map((w) => (
            <View key={w} style={styles.warnRow}>
              <Ionicons name="warning" size={16} color={colors.orange} style={styles.warnIcon} />
              <Text style={styles.warnText}>{w}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>Health</Text>
      <DeviceHealthCard icon="hardware-chip-outline" label="ESP32 connection" value={connected ? 'Connected' : 'Disconnected'} tone={connected ? 'green' : 'orange'} />
      <DeviceHealthCard
        icon="speedometer-outline"
        label="MPU6050 sensor"
        value={device?.mpuOk == null ? 'Unknown' : device.mpuOk ? 'OK' : 'Fault'}
        tone={device?.mpuOk == null ? 'grey' : device.mpuOk ? 'green' : 'red'}
      />
      <DeviceHealthCard icon="navigate-outline" label="GPS availability" value={gps.label} tone={gps.tone} />
      <DeviceHealthCard
        icon="cellular-outline"
        label="GSM registration"
        value={device?.gsmRegistered == null ? 'Unknown' : device.gsmRegistered ? 'Registered' : 'Not registered'}
        tone={device?.gsmRegistered == null ? 'grey' : device.gsmRegistered ? 'green' : 'orange'}
      />
      <DeviceHealthCard
        icon="time-outline"
        label="Last successful communication"
        value={timeAgo(device?.lastUpdated)}
        tone={device?.lastUpdated ? 'green' : 'grey'}
        note={device?.lastUpdated ? formatDateTime(device.lastUpdated) : undefined}
      />
      <DeviceHealthCard icon="speedometer" label="Accident threshold" value="Unavailable" tone="grey" note={settings.accidentThreshold != null ? `Current: ${settings.accidentThreshold}` : 'Cannot be changed from the app yet'} />

      <Text style={styles.section}>Connection</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow icon="finger-print-outline" label="Device identifier" value={device?.deviceId || 'Not available'} />
        <ProfileRow icon="cloud-outline" label="Backend connection" value={backend.v} />
        <ProfileRow icon="swap-horizontal-outline" label="Data source" value={dataSource === 'demo' ? 'Demo (simulated data)' : 'Live (helmet data)'} last />
      </View>

      <Text style={styles.section}>Notification preferences</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="notifications-outline"
          label="Push notifications"
          value={dataSource === 'demo' ? 'Saved on this phone only in demo mode' : undefined}
          right={<Switch value={!!settings.notifications.push} onValueChange={setNotif('push')} trackColor={{ true: colors.primary }} />}
        />
        <ProfileRow
          icon="volume-high-outline"
          label="Alert sound"
          right={<Switch value={!!settings.notifications.sound} onValueChange={setNotif('sound')} trackColor={{ true: colors.primary }} />}
          last
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title },
  demo: { marginTop: spacing.sm },
  section: { ...typography.heading, marginTop: spacing.xl, marginBottom: spacing.sm },
  warnBox: { backgroundColor: colors.orangeSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3 },
  warnIcon: { marginRight: spacing.sm, marginTop: 2 },
  warnText: { flex: 1, fontSize: 13, color: colors.navy },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
});
