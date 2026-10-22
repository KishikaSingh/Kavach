// Home tab: Kavach Smart Helmet Dashboard
// Reads live or demo telemetry via hooks. Displays real fields without fabrication.
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

import { colors, getTone, radius, shadows, spacing, MIN_TOUCH } from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import { formatCoord, getGpsState, GPS_LABELS, hasValidCoords, severityTone, smsLabel } from '../utils/deviceStatus';

const ACCIDENT_LABELS = {
  normal: { label: 'Normal', tone: 'green' },
  warning: { label: 'Warning', tone: 'orange' },
  alert: { label: 'Accident Alert', tone: 'red' },
};

export default function DashboardScreen({ navigation }) {
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
          <View style={styles.brandEmblem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.white} />
          </View>
          <View style={styles.brandTitles}>
            <Text style={styles.greetingText}>STAY SAFE, RIDE SMART</Text>
            <Text style={styles.appName}>Kavach Helmet</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${unreadCount} unread`}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.midnightNavy} />
            {unreadCount > 0 ? (
              <View style={styles.bell}>
                <Text style={styles.bellText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            style={[styles.iconBtn, styles.profileBtn]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.deepNavy} />
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
          style={[styles.emergencyBanner, shadows.card]}
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

      {/* Helmet Status Hero Card (Midnight Navy) */}
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
          <View style={[styles.quickActionIconWrap, { backgroundColor: '#EAF4FA' }]}>
            <Ionicons name="navigate-outline" size={22} color={colors.deepNavy} />
          </View>
          <Text style={styles.quickActionLabel}>Location</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Contacts')}
          accessibilityRole="button"
          accessibilityLabel="Open Emergency Contacts"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: '#E6F8F6' }]}>
            <Ionicons name="people-outline" size={22} color={colors.safetyTeal} />
          </View>
          <Text style={styles.quickActionLabel}>Contacts</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Alerts')}
          accessibilityRole="button"
          accessibilityLabel="Open Alerts"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.emergency} />
          </View>
          <Text style={styles.quickActionLabel}>Alerts</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('DeviceSettings')}
          accessibilityRole="button"
          accessibilityLabel="Open Device Settings"
        >
          <View style={[styles.quickActionIconWrap, { backgroundColor: '#F0F4F8' }]}>
            <Ionicons name="hardware-chip-outline" size={22} color={colors.deepNavy} />
          </View>
          <Text style={styles.quickActionLabel}>Device</Text>
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
            <View style={styles.mapBox} accessibilityLabel="Map preview of the last helmet position">
              {[25, 50, 75].map((p) => (
                <View key={`h${p}`} style={[styles.gridLineH, { top: `${p}%` }]} />
              ))}
              {[25, 50, 75].map((p) => (
                <View key={`v${p}`} style={[styles.gridLineV, { left: `${p}%` }]} />
              ))}
              <View style={styles.radarPing} />
              <Ionicons name="location-sharp" size={36} color={colors.emergency} />
            </View>
            <View style={styles.locationFooter}>
              <View style={styles.flex}>
                <Text style={styles.coordsText}>
                  {formatCoord(device.latitude)}, {formatCoord(device.longitude)}
                </Text>
                <Text style={styles.metaText}>Last GPS fix: {timeAgo(device.gpsLastFixAt)}</Text>
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
            icon="location-outline"
            title="No valid GPS location"
            message="The helmet has not reported a valid GPS fix yet. Coordinates will appear here when telemetry is acquired."
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
            icon="shield-checkmark-outline"
            title="No alerts recorded"
            message="Accident alerts from the helmet will be securely recorded here."
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
                style={[styles.alertRow, i < recent.length - 1 && styles.rowDivider]}
                accessibilityRole="button"
                accessibilityLabel={`Alert: ${a.severity} severity at ${formatDateTime(a.timestamp)}`}
              >
                <View style={[styles.alertIconCircle, { backgroundColor: t.bg }]}>
                  <Ionicons name="warning" size={16} color={t.fg} />
                </View>

                <View style={styles.alertContent}>
                  <View style={styles.alertTopLine}>
                    <Text style={styles.alertTimestamp}>{formatDateTime(a.timestamp)}</Text>
                    <StatusBadge
                      label={a.status}
                      tone={a.status === 'resolved' ? 'green' : 'red'}
                      size="sm"
                    />
                  </View>
                  <View style={styles.alertBottomLine}>
                    <Text style={styles.alertMeta}>
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
            icon="people-outline"
            title="No contacts added"
            message="Add primary emergency contacts to notify immediately in case of an impact."
            actionLabel="Add Contacts"
            onAction={() => navigation.navigate('Contacts')}
          />
        ) : (
          sortedContacts.slice(0, 2).map((c, i, arr) => (
            <View key={c.id} style={[styles.contactRow, i < arr.length - 1 && styles.rowDivider]}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.contactTitleRow}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  {c.isPrimary ? (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.contactPhone}>{c.phone}</Text>
              </View>
              <Pressable
                style={styles.callBtn}
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
    backgroundColor: colors.midnightNavy,
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
    color: colors.safetyTeal,
    letterSpacing: 0.8,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.midnightNavy,
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
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  demoBanner: {
    marginBottom: spacing.md,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emergency,
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
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emergencySub: {
    color: colors.white,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.95,
  },
  heroCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
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
    backgroundColor: 'rgba(0, 184, 169, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 169, 0.3)',
  },
  heroDeviceName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroSubId: {
    color: colors.cyanAccent,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  heroHealthSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  heroSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(54, 207, 201, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(54, 207, 201, 0.35)',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  heroSettingsText: {
    color: colors.cyanAccent,
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
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.midnightNavy,
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
    backgroundColor: '#EAF4FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#D3E4F0',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#D3E4F0',
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
    color: colors.midnightNavy,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
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
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  alertBottomLine: {
    marginTop: 2,
  },
  alertMeta: {
    fontSize: 11,
    color: colors.textMuted,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    color: colors.safetyTeal,
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
    color: colors.text,
  },
  primaryBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: 6,
  },
  primaryBadgeText: {
    color: colors.safetyTeal,
    fontSize: 9,
    fontWeight: '800',
  },
  contactPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
