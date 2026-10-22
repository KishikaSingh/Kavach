import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlerts } from '../hooks/useAlerts.js';
import { useDemoControls } from '../hooks/useDemoControls.js';
import { useDevice } from '../hooks/useDevice.js';
import { LocationPreview } from '../components/LocationPreview.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import ScreenContainer from '../components/ScreenContainer.js';
import DemoModeBanner from '../components/DemoModeBanner.js';
import AppButton from '../components/AppButton.js';
import AppCard from '../components/AppCard.js';
import { radius, shadows, spacing, typography } from '../constants/theme';
import { useTheme } from '../hooks/useTheme.js';
import { formatDateTime, relativeTime } from '../utils/formatTime.js';
import { PERSON2_ROUTES } from './person2Routes.js';

export function LocationScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { device, dataSource, backendReachable, loading, error, refresh, refreshing, retry } = useDevice();
  const { activeAlerts } = useAlerts();
  const { isDemo } = useDemoControls();

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (loading && !device) return <LoadingState label="Acquiring helmet position…" />;
  if (error && !device) return <ErrorState error={error} onRetry={retry} />;

  if (!device) {
    return (
      <View style={styles.fallbackScreen}>
        <EmptyState
          icon="location-outline"
          title="No helmet telemetry"
          body="The application has not yet received GPS telemetry from the helmet."
          actionLabel="Retry Connection"
          onAction={retry}
        />
      </View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.safetyTeal} />}
      >
        <View style={styles.headerArea}>
          <Text style={styles.title} accessibilityRole="header">
            Helmet Location
          </Text>
          <Text style={styles.subtitle}>Real-time GPS coordinates and position status</Text>
        </View>

        {isDemo || dataSource === 'demo' ? (
          <DemoModeBanner label="DEMO MODE — Simulated GPS coordinates" style={styles.bannerMargin} />
        ) : null}

        {backendReachable === false ? (
          <StatusBanner tone="danger">Backend unreachable. Displaying cached position which may be outdated.</StatusBanner>
        ) : null}

        {disconnected ? (
          <StatusBanner tone="warning">
            Helmet disconnected. Last synchronization {relativeTime(device.lastUpdated)}.
          </StatusBanner>
        ) : null}

        {error ? <StatusBanner tone="danger">{error.message}</StatusBanner> : null}

        <LocationPreview
          latitude={device.latitude}
          longitude={device.longitude}
          gpsValid={device.gpsValid === true && device.latitude != null}
          gpsStatus={gpsStatus}
          timestampLabel={`Last GPS fix: ${formatDateTime(device.gpsLastFixAt)} (${relativeTime(device.gpsLastFixAt)})`}
        />

        <AppCard variant="default" style={styles.telemetryCard}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.metaText}>
              Last communication with helmet: <Text style={styles.metaBold}>{relativeTime(device.lastUpdated)}</Text>
            </Text>
          </View>
          {device.gsmRegistered === false ? (
            <View style={[styles.metaRow, { marginTop: 6 }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={[styles.metaText, { color: colors.warning }]}>
                GSM module not registered. Cellular SMS dispatch may fail.
              </Text>
            </View>
          ) : null}
        </AppCard>

        <AppButton
          title={refreshing ? 'Refreshing…' : 'Refresh Location'}
          icon="refresh-outline"
          variant="secondary"
          onPress={onRefresh}
          loading={refreshing}
          style={styles.refreshBtn}
        />

        {active ? (
          <Pressable
            onPress={() => navigation?.navigate(PERSON2_ROUTES.AlertDetails, { alertId: active.id })}
            accessibilityRole="button"
            accessibilityLabel="Open active accident alert"
            style={styles.activeAlertCard}
          >
            <View style={styles.activeAlertIconWrap}>
              <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.activeAlertTextWrap}>
              <Text style={styles.activeAlertTitle}>ACTIVE ACCIDENT ALERT</Text>
              <Text style={styles.activeAlertSub}>Tap to review coordinates & emergency dispatch</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation?.navigate(PERSON2_ROUTES.Alerts)}
          accessibilityRole="button"
          accessibilityLabel="Open alert history"
          style={styles.link}
        >
          <Text style={styles.linkText}>View all alert records</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  fallbackScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  containerPadding: {
    padding: 0,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bannerMargin: {
    marginBottom: spacing.md,
  },
  telemetryCard: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  metaBold: {
    fontWeight: '700',
    color: colors.text,
  },
  refreshBtn: {
    marginTop: spacing.md,
  },
  activeAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emergency,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  activeAlertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activeAlertTextWrap: {
    flex: 1,
  },
  activeAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  activeAlertSub: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  link: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.safetyTeal,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default LocationScreen;
