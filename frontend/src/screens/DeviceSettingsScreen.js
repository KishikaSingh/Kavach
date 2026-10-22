// Settings tab: device health + warnings + notification toggles.
// Unsupported items (accident threshold, battery) are labelled Unavailable / Coming soon, never faked.
import React, { useCallback, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import DeviceHealthCard from '../components/DeviceHealthCard';
import DemoBadge from '../components/DemoBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import AppButton from '../components/AppButton';
import Loader from '../components/Loader';
import ProfileRow from '../components/ProfileRow';

import useDevice from '../hooks/useDevice';
import useSettings from '../hooks/useSettings';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import { getGpsState, GPS_LABELS } from '../utils/deviceStatus';

export default function DeviceSettingsScreen() {
  const {
    device,
    dataSource,
    backendReachable,
    loading: deviceLoading,
    error: deviceError,
    refresh: refreshDevice,
  } = useDevice();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    retry: retrySettings,
    updateSettings,
  } = useSettings();

  const [refreshing, setRefreshing] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSaveError(null);
    try {
      await Promise.allSettled([
        typeof refreshDevice === 'function' ? refreshDevice() : Promise.resolve(),
        typeof retrySettings === 'function' ? retrySettings() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDevice, retrySettings]);

  // Fatal device error with no existing device data to display
  if (deviceError && !device) {
    return (
      <ScreenContainer>
        <ErrorState message={String(deviceError.message || deviceError)} onRetry={onRefresh} />
      </ScreenContainer>
    );
  }

  // Initial loading when neither device nor settings have arrived yet
  const isInitialLoading = (deviceLoading && !device) || (settingsLoading && !settings && !settingsError);
  if (isInitialLoading) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  // Device not selected or unavailable after loading completed
  if (!device && !deviceLoading) {
    return (
      <ScreenContainer onRefresh={onRefresh} refreshing={refreshing}>
        <Text style={styles.title}>Device status</Text>
        {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}
        <EmptyState
          icon="hardware-chip-outline"
          title="No helmet connected"
          message="No helmet device was found or selected. Pair a helmet or switch to demo mode to view device status."
          actionLabel="Refresh"
          onAction={onRefresh}
          style={{ marginTop: spacing.xl }}
        />
      </ScreenContainer>
    );
  }

  const connected = device?.helmetStatus === 'connected';
  const gpsState = getGpsState(device);
  const gps = GPS_LABELS[gpsState] || GPS_LABELS.unavailable;

  // Plain-language warnings, one per problem.
  const warnings = [];
  if (!connected) warnings.push('The helmet is offline. Readings below are the last reported values.');
  if (device?.mpuOk === false) warnings.push('The MPU6050 motion sensor is reporting a fault.');
  if (device?.mpuOk == null) warnings.push('MPU6050 status is not reported by the helmet.');
  if (gpsState === 'searching' || gpsState === 'unavailable') warnings.push('GPS data is missing. No valid fix has been received.');
  if (gpsState === 'stale') warnings.push('GPS data is outdated (last fix over 5 minutes ago).');
  if (device && device.gsmRegistered === false) warnings.push('The GSM module is not registered on a network, so SMS alerts cannot be sent.');
  if (backendReachable === false) warnings.push('The backend cannot be reached. Data may be out of date.');

  const backend = backendReachable === true
    ? { v: 'Reachable', t: 'green' }
    : backendReachable === false
      ? { v: 'Unreachable', t: 'red' }
      : { v: 'Not checked', t: 'grey' };

  // Documented project default: push: true, sound: true
  const pushEnabled = settings?.notifications?.push ?? true;
  const soundEnabled = settings?.notifications?.sound ?? true;

  const setNotif = (key) => async (value) => {
    if (!settings || typeof updateSettings !== 'function') return;
    setSaveError(null);
    try {
      await updateSettings({ notifications: { [key]: value } });
    } catch (err) {
      setSaveError(err?.message || 'Failed to update notification preferences.');
    }
  };

  const accidentThresholdNote = settings?.accidentThreshold != null
    ? `Current: ${settings.accidentThreshold}`
    : settingsLoading && !settings
      ? 'Loading settings…'
      : 'Cannot be changed from the app yet';

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
      <DeviceHealthCard
        icon="hardware-chip-outline"
        label="ESP32 connection"
        value={connected ? 'Connected' : 'Disconnected'}
        tone={connected ? 'green' : 'orange'}
      />
      <DeviceHealthCard
        icon="speedometer-outline"
        label="MPU6050 sensor"
        value={device?.mpuOk == null ? 'Unknown' : device.mpuOk ? 'OK' : 'Fault'}
        tone={device?.mpuOk == null ? 'grey' : device.mpuOk ? 'green' : 'red'}
      />
      <DeviceHealthCard
        icon="navigate-outline"
        label="GPS availability"
        value={gps.label}
        tone={gps.tone}
      />
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
      <DeviceHealthCard
        icon="speedometer"
        label="Accident threshold"
        value="Unavailable"
        tone="grey"
        note={accidentThresholdNote}
      />

      <Text style={styles.section}>Connection</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow icon="finger-print-outline" label="Device identifier" value={device?.deviceId || 'Not available'} />
        <ProfileRow icon="cloud-outline" label="Backend connection" value={backend.v} />
        <ProfileRow icon="swap-horizontal-outline" label="Data source" value={dataSource === 'demo' ? 'Demo (simulated data)' : 'Live (helmet data)'} last />
      </View>

      <Text style={styles.section}>Notification preferences</Text>

      {settingsError ? (
        <View style={styles.settingsErrorBox} accessibilityRole="alert">
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.red} style={styles.warnIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsErrorTitle}>Settings unavailable</Text>
              <Text style={styles.settingsErrorText}>
                {String(settingsError?.message || 'Could not load your notification preferences.')}
              </Text>
              {retrySettings ? (
                <AppButton
                  title="Retry"
                  icon="refresh"
                  variant="secondary"
                  onPress={retrySettings}
                  style={styles.retryBtn}
                />
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {saveError ? (
        <View style={[styles.warnBox, { backgroundColor: colors.redSoft, marginTop: spacing.sm }]} accessibilityRole="alert">
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle" size={16} color={colors.red} style={styles.warnIcon} />
            <Text style={[styles.warnText, { color: colors.red }]}>{saveError}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="notifications-outline"
          label="Push notifications"
          value={
            !settings
              ? 'Settings currently unavailable'
              : dataSource === 'demo'
                ? 'Saved on this phone only in demo mode'
                : undefined
          }
          right={
            <Switch
              value={Boolean(pushEnabled)}
              onValueChange={setNotif('push')}
              disabled={!settings}
              trackColor={{ true: colors.primary }}
            />
          }
        />
        <ProfileRow
          icon="volume-high-outline"
          label="Alert sound"
          right={
            <Switch
              value={Boolean(soundEnabled)}
              onValueChange={setNotif('sound')}
              disabled={!settings}
              trackColor={{ true: colors.primary }}
            />
          }
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
  settingsErrorBox: {
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  settingsErrorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
    marginBottom: 2,
  },
  settingsErrorText: {
    fontSize: 13,
    color: colors.navy,
  },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
});
