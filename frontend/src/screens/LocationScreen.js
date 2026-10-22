import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useAlerts } from '../hooks/useAlerts.js';
import { useDemoControls } from '../hooks/useDemoControls.js';
import { useDevice } from '../hooks/useDevice.js';
import { LocationPreview } from '../components/LocationPreview.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import ScreenContainer from '../components/ScreenContainer.js';
import { colors, space, type } from '../components/person2Theme.js';
import { formatDateTime, relativeTime } from '../utils/formatTime.js';
import { PERSON2_ROUTES } from './person2Routes.js';

export function LocationScreen({ navigation }) {
  const { device, dataSource, backendReachable, loading, error, refresh, refreshing, retry } = useDevice();
  const { activeAlerts } = useAlerts();
  const { isDemo } = useDemoControls();

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  if (loading && !device) return <LoadingState label="Loading location" />;
  if (error && !device) return <ErrorState error={error} onRetry={retry} />;
  if (!device) {
    return (
      <EmptyState
        title="No helmet data yet"
        body="The app has not received a location report from the helmet."
        actionLabel="Retry"
        onAction={retry}
      />
    );
  }

  const active = activeAlerts[0];
  const gpsStatus = device.gpsStatus;
  const disconnected = device.helmetStatus === 'disconnected';

  return (
    <ScreenContainer edges={['top']} scroll={false} contentContainerStyle={styles.containerPadding}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={type.title} accessibilityRole="header">
          Location
        </Text>
        {isDemo || dataSource === 'demo' ? (
          <StatusBanner tone="info" accessibilityLabel="Demo mode. This is not a live helmet reading.">
            Demo — this is simulated helmet data, not a live reading.
          </StatusBanner>
        ) : null}
        {backendReachable === false ? (
          <StatusBanner tone="danger">Backend unreachable. Showing the last data received, which may be stale.</StatusBanner>
        ) : null}
        {disconnected ? (
          <StatusBanner tone="warning">
            Helmet disconnected. Last communication {relativeTime(device.lastUpdated)}.
          </StatusBanner>
        ) : null}
        {error ? <StatusBanner tone="danger">{error.message}</StatusBanner> : null}

        <LocationPreview
          latitude={device.latitude}
          longitude={device.longitude}
          gpsValid={device.gpsValid === true && device.latitude != null}
          gpsStatus={gpsStatus}
          timestampLabel={`Last GPS fix ${formatDateTime(device.gpsLastFixAt)} (${relativeTime(device.gpsLastFixAt)})`}
        />

        <Text style={[type.muted, styles.meta]}>Last helmet update {relativeTime(device.lastUpdated)}</Text>
        {device.gsmRegistered === false ? (
          <Text style={type.muted}>GSM is not registered. Emergency SMS from the helmet may fail.</Text>
        ) : null}

        <Pressable
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh location"
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{refreshing ? 'Refreshing…' : 'Refresh location'}</Text>
        </Pressable>

        {active ? (
          <Pressable
            onPress={() => navigation?.navigate(PERSON2_ROUTES.AlertDetails, { alertId: active.id })}
            accessibilityRole="button"
            accessibilityLabel="Open active accident alert"
            style={styles.alertBtn}
          >
            <Text style={styles.alertBtnText}>Active accident alert — view details</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation?.navigate(PERSON2_ROUTES.Alerts)}
          accessibilityRole="button"
          accessibilityLabel="Open alert history"
          style={styles.link}
        >
          <Text style={styles.linkText}>View all alerts</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  containerPadding: { padding: 0 },
  content: { padding: space.md, paddingBottom: 40, gap: space.sm },
  meta: { marginTop: space.xs },
  secondary: {
    marginTop: space.md,
    backgroundColor: colors.cardAlt,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '700' },
  alertBtn: {
    marginTop: space.sm,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  alertBtnText: { color: '#FFFFFF', fontWeight: '700' },
  link: { marginTop: space.md, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '700' },
});
export default LocationScreen;
