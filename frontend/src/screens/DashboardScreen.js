// Home tab: Kavach Smart Helmet Dashboard
// Reads live or demo telemetry via hooks. Displays real fields without fabrication.
// Dynamic Theme-aware component with high-contrast accessibility.

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import AppCard from '../components/AppCard';
import MetricCard from '../components/MetricCard';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import ConnectionIndicator from '../components/ConnectionIndicator';
import DemoModeBanner from '../components/DemoModeBanner';
import EmptyState from '../components/EmptyState';
import AppButton from '../components/AppButton';
import { StatusBanner } from '../components/ScreenStates.js';

import useDevice from '../hooks/useDevice';
import useAlerts from '../hooks/useAlerts';
import useContacts from '../hooks/useContacts';
import useNotifications from '../hooks/useNotifications';
import { useTheme } from '../theme/ThemeProvider';

import { radius, shadows, spacing, MIN_TOUCH } from '../constants/theme';
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
          <View style={[styles.brandEmblem, { backgroundColor: isDark ? colors.cardElevated : colors.midnightNavy, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.safetyTeal} />
          </View>
          <View style={styles.brandTitles}>
            <Text style={[styles.greetingText, { color: colors.safetyTeal }]}>STAY SAFE, RIDE SMART</Text>
            <Text style={[styles.appName, { color: colors.text }]}>Kavach Helmet</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${unreadCount} unread`}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={[styles.bell, { backgroundColor: colors.emergency }]}>
                <Text style={styles.bellText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            style={[styles.iconBtn, styles.profileBtn]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile and Appearance settings"
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.text} />
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
      <AppCard variant="hero" style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIdentity}>
            <View style={styles.heroHelmetCircle}>
              <Ionicons name="shield-checkmark" size={22} color={colors.safetyTeal} />
            </View>
            <View>
              <Text style={styles.heroDeviceName}>{device?.id || 'KAVACH-HLM-01'}</Text>
              <Text style={styles.heroSubId}>Smart Safety System</Text>
            </View>
          </View>
          <ConnectionIndicator
            connected={connected}
            label={connected ? 'Connected' : 'Disconnected'}
            style={styles.heroBadge}
          />
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroMiddleRow}>
          <View style={styles.heroHealthBox}>
            <View style={styles.heroHealthHeader}>
              <Ionicons
                name={health.tone === 'red' ? 'alert-circle' : health.tone === 'orange' ? 'warning' : 'checkmark-circle'}
                size={20}
                color={health.tone === 'red' ? colors.emergency : health.tone === 'orange' ? colors.warning : colors.cyanAccent}
                style={styles.heroHealthIcon}
              />
              <Text style={styles.heroHealthTitle}>{health.title}</Text>
            </View>
            <Text style={styles.heroHealthSub}>{health.sub}</Text>
          </View>

          <Pressable
            style={styles.heroSettingsBtn}
            onPress={() => navigation.navigate('DeviceSettings')}
            accessibilityRole="button"
            accessibilityLabel="Device Settings"
          >
            <Ionicons name="settings-outline" size={16} color={colors.cyanAccent} />
            <Text style={styles.heroSettingsText}>Manage</Text>
          </Pressable>
        </View>
      </AppCard>

      {/* Quick Action Navigation Grid */}
      <View style={styles.quickActionsRow}>
        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Location')}
          accessibilityRole="button"
          accessibilityLabel="Open Location"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: isDark ? colors.cardElevated : '#EAF4FA', borderColor: colors.border }]}>
            <Ionicons name="navigate-outline" size={22} color={isDark ? colors.cyanAccent : colors.deepNavy} />
          </View>
          <Text style={[styles.quickActionLabel, { color: colors.text }]}>Location</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Contacts')}
          accessibilityRole="button"
          accessibilityLabel="Open Emergency Contacts"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: isDark ? colors.cardElevated : '#E6F8F6', borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={22} color={colors.safetyTeal} />
          </View>
          <Text style={[styles.quickActionLabel, { color: colors.text }]}>Contacts</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Alerts')}
          accessibilityRole="button"
          accessibilityLabel="Open Alerts"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: isDark ? colors.cardElevated : '#FEE2E2', borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.emergency} />
          </View>
          <Text style={[styles.quickActionLabel, { color: colors.text }]}>Alerts</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('DeviceSettings')}
          accessibilityRole="button"
          accessibilityLabel="Open Device Settings"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: isDark ? colors.cardElevated : '#F0F4F8', borderColor: colors.border }]}>
            <Ionicons name="hardware-chip-outline" size={22} color={isDark ? colors.textSecondary : colors.deepNavy} />
          </View>
          <Text style={[styles.quickActionLabel, { color: colors.text }]}>Device</Text>
        </Pressable>
      </View>

      {/* System Telemetry Metric Cards */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="battery-charging-outline"
            label="Battery Level"
            value={device?.batteryLevel != null ? `${device.batteryLevel}%` : 'Unavailable'}
            sublabel={device?.batteryLevel != null ? (device.batteryLevel < 20 ? 'Low Battery' : 'Optimal Charge') : 'No telematics'}
            tone={device?.batteryLevel != null ? (device.batteryLevel < 20 ? 'orange' : 'teal') : 'grey'}
          />
        </View>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="navigate-outline"
            label="GPS Fix"
            value={gps.label}
            sublabel={validCoords ? `${formatCoord(device.latitude)}, ${formatCoord(device.longitude)}` : 'No valid signal'}
            tone={gps.tone}
            onPress={() => navigation.navigate('Location')}
          />
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="sync-outline"
            label="Last Sync"
            value={device?.lastUpdated ? timeAgo(device.lastUpdated) : 'Unavailable'}
            sublabel={connected ? 'Active heartbeat' : 'Device idle'}
            tone={connected ? 'teal' : 'orange'}
          />
        </View>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="shield-checkmark-outline"
            label="Accident Sensor"
            value={accident.label}
            sublabel={connected ? 'Real-time protection' : 'Last known state'}
            tone={accident.tone}
            onPress={() => navigation.navigate('Alerts')}
          />
        </View>
      </View>

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
                  backgroundColor: isDark ? colors.cardElevated : '#EAF4FA',
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Map preview of the last helmet position"
            >
              {[25, 50, 75].map((p) => (
                <View key={`h${p}`} style={[styles.gridLineH, { top: `${p}%`, backgroundColor: isDark ? colors.border : '#D3E4F0' }]} />
              ))}
              {[25, 50, 75].map((p) => (
                <View key={`v${p}`} style={[styles.gridLineV, { left: `${p}%`, backgroundColor: isDark ? colors.border : '#D3E4F0' }]} />
              ))}
              <View style={styles.radarPing} />
              <Ionicons name="location-sharp" size={36} color={colors.emergency} />
            </View>
            <View style={styles.locationFooter}>
              <View style={styles.flex}>
                <Text style={[styles.coordsText, { color: colors.text }]}>
                  {formatCoord(device.latitude)}, {formatCoord(device.longitude)}
                </Text>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>Last GPS fix: {timeAgo(device.gpsLastFixAt)}</Text>
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
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
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHelmetCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 184, 169, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 169, 0.4)',
  },
  heroDeviceName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroSubId: {
    color: '#36CFC9',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  heroBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: spacing.md,
  },
  heroMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHealthBox: {
    flex: 1,
  },
  heroHealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHealthIcon: {
    marginRight: 6,
  },
  heroHealthTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heroHealthSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  heroSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(54, 207, 201, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(54, 207, 201, 0.45)',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  heroSettingsText: {
    color: '#36CFC9',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '23%',
  },
  quickActionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    ...shadows.sm,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginHorizontal: -4,
  },
  metricsCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  mapBox: {
    height: 140,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  radarPing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 184, 169, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 169, 0.4)',
  },
  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  coordsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    marginTop: 2,
  },
  cardNoPadding: {
    padding: 0,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH + 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  alertIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  },
  alertTimestamp: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertBottomLine: {
    marginTop: 2,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    fontSize: 16,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: 6,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
