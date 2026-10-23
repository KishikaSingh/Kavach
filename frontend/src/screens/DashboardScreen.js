// Home tab: Kavach Smart Helmet Dashboard
// Reads live or demo telemetry via hooks. Displays real fields without fabrication.
// Dynamic Theme-aware component with high-contrast accessibility.

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import DemoModeBanner from '../components/DemoModeBanner';
import EmptyState from '../components/EmptyState';
import AppButton from '../components/AppButton';
import { StatusBanner } from '../components/ScreenStates.js';
import HeroHelmetCard from '../components/HeroHelmetCard.js';
import DashboardQuickNav from '../components/DashboardQuickNav.js';
import DashboardMetricsGrid from '../components/DashboardMetricsGrid.js';

import useDevice from '../hooks/useDevice';
import useAlerts from '../hooks/useAlerts';
import useContacts from '../hooks/useContacts';
import useNotifications from '../hooks/useNotifications';
import { useTheme } from '../theme/ThemeProvider';

import { radius, shadows, spacing } from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import { formatCoord, getGpsState, GPS_LABELS, hasValidCoords, severityTone, smsLabel } from '../utils/deviceStatus';

const ACCIDENT_LABELS = {
  normal: { label: 'Normal', tone: 'green' },
  warning: { label: 'Warning', tone: 'orange' },
  alert: { label: 'Accident Alert', tone: 'red' },
};

export default function DashboardScreen({ navigation }) {
  const { colors, getTone, isDark } = useTheme();
  const { device, dataSource, error: deviceError, refresh: refreshDevice } = useDevice();
  const { alerts, refresh: refreshAlerts, error: alertsError } = useAlerts();
  const { contacts } = useContacts();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshDevice(), refreshAlerts()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDevice, refreshAlerts]);

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [alerts]
  );
  const latest = sortedAlerts[0];
  const recent = sortedAlerts.slice(0, 3);
  const openAlert = (id) => navigation.navigate('AlertDetails', { alertId: id });

  const error = deviceError || alertsError;

  const connected = device?.helmetStatus === 'connected';
  const accident = ACCIDENT_LABELS[device?.accidentStatus] || { label: 'Unknown', tone: 'grey' };
  const gps = GPS_LABELS[getGpsState(device)];
  const validCoords = hasValidCoords(device);
  const sortedContacts = [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const emergencyAlert = sortedAlerts.find((a) => a.status !== 'resolved') || latest;

  const call = async (phone) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (_e) {
      Alert.alert('Unable to call', 'This device cannot place calls.');
    }
  };

  const getHealthSummary = () => {
    if (device?.accidentStatus === 'alert') {
      return { title: 'Accident Detected', sub: 'Emergency response triggered', tone: 'red' };
    }
    if (device?.accidentStatus === 'warning') {
      return { title: 'Impact Warning', sub: 'Abnormal shock or sensor reading', tone: 'orange' };
    }
    if (connected) {
      return { title: 'All Systems Normal', sub: 'Live IoT telemetry active', tone: 'teal' };
    }
    return { title: 'Helmet Offline', sub: 'Awaiting device synchronization', tone: 'orange' };
  };

  const health = getHealthSummary();

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={refreshing}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.brandEmblem, { backgroundColor: colors.primarySoft, borderColor: isDark ? colors.border : '#B2EBF2' }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.safetyTeal} />
          </View>
          <View style={styles.brandTitles}>
            <Text style={[styles.appName, { color: colors.text }]}>Kavach</Text>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Smart Helmet Safety</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: isDark ? colors.cardElevated : colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${unreadCount} unread`}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={[styles.bell, { backgroundColor: colors.emergency }]}>
                <Text style={styles.bellText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            style={[styles.iconBtn, styles.profileBtn, { backgroundColor: isDark ? colors.cardElevated : colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile and Appearance settings"
          >
            <Ionicons name="person-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Error & Demo Mode Banners */}
      {error ? (
        <StatusBanner tone="danger">Live data unavailable: {String(error.message || error)}</StatusBanner>
      ) : null}
      {dataSource === 'demo' ? (
        <DemoModeBanner label="DEMO MODE — Simulated device data" style={styles.demoBanner} />
      ) : null}

      {/* Active Emergency Alert Banner */}
      {device?.accidentStatus === 'alert' ? (
        <Pressable
          style={[styles.emergencyBanner, { backgroundColor: colors.emergency }, shadows.card]}
          onPress={() => (emergencyAlert ? openAlert(emergencyAlert.id) : navigation.navigate('Alerts'))}
          accessibilityRole="button"
          accessibilityLabel="Active emergency alert from helmet. Tap to view details."
        >
          <View style={styles.emergencyIconWrap}>
            <Ionicons name="alert-circle" size={28} color={colors.white} />
          </View>
          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>ACTIVE EMERGENCY</Text>
            <Text style={styles.emergencySub}>Accident alert from helmet · Tap for details</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </Pressable>
      ) : null}

      {/* Helmet Status Hero Card */}
      <HeroHelmetCard
        device={device}
        connected={connected}
        health={health}
        onManagePress={() => navigation.navigate('Settings')}
        colors={colors}
        isDark={isDark}
      />

      {/* Quick Action Navigation Grid */}
      <DashboardQuickNav
        onNavigate={(route) => navigation.navigate(route)}
        colors={colors}
        isDark={isDark}
      />

      {/* System Telemetry Metric Cards */}
      <DashboardMetricsGrid
        device={device}
        connected={connected}
        gps={gps}
        validCoords={validCoords}
        accident={accident}
        onNavigate={(route) => navigation.navigate(route)}
      />

      {/* Helmet Location Preview Section */}
      <SectionHeader
        title="Helmet Location"
        actionLabel="View Map"
        onAction={() => navigation.navigate('Location')}
      />
      <AppCard variant="default">
        {validCoords ? (
          <>
            <View
              style={[
                styles.mapBox,
                {
                  backgroundColor: isDark ? colors.cardElevated : '#EEF5FB',
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Map preview of the last helmet position"
            >
              <View style={[styles.mapPinPulse, { backgroundColor: 'rgba(0, 184, 169, 0.12)' }]}>
                <View style={[styles.mapPinPulseInner, { backgroundColor: 'rgba(0, 184, 169, 0.25)' }]}>
                  <View style={[styles.mapPinCenter, { backgroundColor: colors.emergency }]}>
                    <Ionicons name="location" size={22} color="#FFFFFF" />
                  </View>
                </View>
              </View>

              <View style={[styles.mapCoordsBadge, { backgroundColor: isDark ? 'rgba(11, 18, 32, 0.88)' : 'rgba(255, 255, 255, 0.94)', borderColor: colors.border }]}>
                <Ionicons name="navigate-outline" size={13} color={colors.safetyTeal} style={{ marginRight: 4 }} />
                <Text style={[styles.mapCoordsText, { color: colors.text }]}>
                  {formatCoord(device.latitude)}, {formatCoord(device.longitude)}
                </Text>
              </View>
            </View>
            <View style={styles.locationFooter}>
              <View style={styles.flex}>
                <Text style={[styles.coordsText, { color: colors.text }]}>
                  Live Satellite Position
                </Text>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>Last updated: {timeAgo(device.gpsLastFixAt)}</Text>
              </View>
              <AppButton
                title="Open Map"
                variant="secondary"
                size="sm"
                icon="map-outline"
                onPress={() => navigation.navigate('Location')}
              />
            </View>
          </>
        ) : (
          <EmptyState
            title="No valid GPS location"
            body="The helmet has not reported a valid GPS fix yet. Coordinates will appear here when telemetry is acquired."
            actionLabel="Open Location Tab"
            onAction={() => navigation.navigate('Location')}
          />
        )}
      </AppCard>

      {/* Recent Alerts Section */}
      <SectionHeader
        title="Recent Alerts"
        actionLabel="View All"
        onAction={() => navigation.navigate('Alerts')}
      />
      {recent.length === 0 ? (
        <AppCard variant="default">
          <EmptyState
            title="No alerts recorded"
            body="Accident alerts from the helmet will be securely recorded here."
          />
        </AppCard>
      ) : (
        <AppCard variant="default" contentStyle={styles.cardNoPadding}>
          {recent.map((a, i) => {
            const t = getTone(severityTone(a.severity));
            return (
              <Pressable
                key={a.id}
                onPress={() => openAlert(a.id)}
                style={[styles.alertRow, i < recent.length - 1 && [styles.rowDivider, { borderBottomColor: colors.border }]]}
                accessibilityRole="button"
                accessibilityLabel={`Alert: ${a.severity} severity at ${formatDateTime(a.timestamp)}`}
              >
                <View style={[styles.alertIconCircle, { backgroundColor: t.bg }]}>
                  <Ionicons name="warning" size={16} color={t.fg} />
                </View>

                <View style={styles.alertContent}>
                  <View style={styles.alertTopLine}>
                    <Text style={[styles.alertTimestamp, { color: colors.text }]}>{formatDateTime(a.timestamp)}</Text>
                    <StatusBadge
                      label={a.status}
                      tone={a.status === 'resolved' ? 'green' : 'red'}
                    />
                  </View>
                  <View style={styles.alertBottomLine}>
                    <Text style={[styles.alertMeta, { color: colors.textSecondary }]}>
                      {a.severity.toUpperCase()} · {smsLabel(a.smsStatus).label}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </AppCard>
      )}

      {/* Emergency Contacts Section */}
      <SectionHeader
        title="Emergency Contacts"
        actionLabel="Manage"
        onAction={() => navigation.navigate('Contacts')}
      />
      <AppCard variant="default">
        {sortedContacts.length === 0 ? (
          <EmptyState
            title="No contacts added"
            body="Add primary emergency contacts to notify immediately in case of an impact."
            actionLabel="Add Contacts"
            onAction={() => navigation.navigate('Contacts')}
          />
        ) : (
          sortedContacts.slice(0, 2).map((c, i, arr) => (
            <View key={c.id} style={[styles.contactRow, i < arr.length - 1 && [styles.rowDivider, { borderBottomColor: colors.border }]]}>
              <View style={[styles.contactAvatar, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.contactAvatarText, { color: colors.safetyTeal }]}>
                  {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.contactTitleRow}>
                  <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                  {c.isPrimary ? (
                    <View style={[styles.primaryBadge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[styles.primaryBadgeText, { color: colors.safetyTeal }]}>PRIMARY</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{c.phone}</Text>
              </View>
              <Pressable
                style={[styles.callBtn, { backgroundColor: colors.success }]}
                onPress={() => call(c.phone)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${c.name}`}
              >
                <Ionicons name="call" size={18} color={colors.white} />
              </Pressable>
            </View>
          ))
        )}
      </AppCard>

      {/* Bottom Spacing */}
      <View style={{ height: spacing.xxl }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandEmblem: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    ...shadows.sm,
  },
  brandTitles: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  profileBtn: {
    marginLeft: spacing.xs,
  },
  bell: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  demoBanner: {
    marginBottom: spacing.md,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  emergencyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emergencyText: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emergencySub: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.95,
  },
  mapBox: {
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  mapPinPulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinPulseInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinCenter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  mapCoordsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  mapCoordsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coordsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    marginTop: 2,
  },
  cardNoPadding: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  alertIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  alertTimestamp: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  contactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  contactPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
