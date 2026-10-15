// Home tab. Reads everything through hooks (never Firebase). Shows only real fields from the
// device/alert objects; null stays "unavailable" and nothing is invented.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import StatusCard from '../components/StatusCard';
import StatusBadge from '../components/StatusBadge';
import DemoBadge from '../components/DemoBadge';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import AppButton from '../components/AppButton';
import HelmetPickerModal from '../components/HelmetPickerModal';

import useDevice from '../hooks/useDevice';
import useAlerts from '../hooks/useAlerts';
import useContacts from '../hooks/useContacts';
import useNotifications from '../hooks/useNotifications';

import { colors, getTone, radius, shadows, spacing, typography, MIN_TOUCH } from '../constants/theme';
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
  const [pickerOpen, setPickerOpen] = useState(false);

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
  if (error && !device) {
    return (
      <ScreenContainer>
        <ErrorState message={String(error.message || error)} onRetry={onRefresh} />
      </ScreenContainer>
    );
  }

  const connected = device?.helmetStatus === 'connected';
  const accident = ACCIDENT_LABELS[device?.accidentStatus] || { label: 'Unknown', tone: 'grey' };
  const gps = GPS_LABELS[getGpsState(device)];
  const validCoords = hasValidCoords(device);
  const sortedContacts = [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const emergencyAlert = sortedAlerts.find((a) => a.status !== 'resolved') || latest;

  const call = async (phone) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (e) {
      Alert.alert('Unable to call', 'This device cannot place calls.');
    }
  };

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="shield-checkmark" size={22} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.appName}>Smart Helmet</Text>
          <StatusBadge label={connected ? 'Helmet connected' : 'Helmet disconnected'} tone={connected ? 'green' : 'orange'} />
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.navy} />
          {unreadCount > 0 ? (
            <View style={styles.bell}>
              <Text style={styles.bellText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.navy} />
        </Pressable>
      </View>

      {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

      {/* Active emergency */}
      {device?.accidentStatus === 'alert' ? (
        <Pressable
          style={[styles.emergency, shadows.card]}
          onPress={() => (emergencyAlert ? openAlert(emergencyAlert.id) : navigation.navigate('Alerts'))}
          accessibilityRole="button"
        >
          <Ionicons name="alert-circle" size={32} color={colors.white} />
          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>Active emergency</Text>
            <Text style={styles.emergencySub}>Accident alert from the helmet. Tap to view details.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Pressable>
      ) : null}

      {/* Summary cards */}
      <View style={styles.grid}>
        <StatusCard
          style={styles.gridItem}
          icon="hardware-chip-outline"
          title="Helmet Status"
          value={connected ? 'Connected' : 'Disconnected'}
          subtitle={`${device?.deviceId || 'No helmet'} - tap to switch`}
          tone={connected ? 'green' : 'orange'}
          onPress={() => setPickerOpen(true)}
        />
        <StatusCard
          style={styles.gridItem}
          icon="pulse-outline"
          title="Accident Detection"
          value={accident.label}
          tone={accident.tone}
          subtitle={!connected ? 'Last reported value' : undefined}
        />
        <StatusCard
          style={styles.gridItem}
          icon="navigate-outline"
          title="GPS Status"
          value={gps.label}
          tone={gps.tone}
          subtitle={getGpsState(device) === 'stale' ? 'Last fix over 5 min ago' : undefined}
          onPress={() => navigation.navigate('Location')}
        />
        <StatusCard
          style={styles.gridItem}
          icon="people-outline"
          title="Emergency Contacts"
          value={contacts.length > 0 ? 'Configured' : 'Not configured'}
          tone={contacts.length > 0 ? 'green' : 'orange'}
          subtitle={contacts.length > 0 ? `${contacts.length} contact${contacts.length === 1 ? '' : 's'}` : undefined}
          onPress={() => navigation.navigate('Contacts')}
        />
        <StatusCard
          style={styles.gridItem}
          icon="battery-half-outline"
          title="Battery Level"
          value={device?.batteryLevel != null ? `${device.batteryLevel}%` : 'Not supported yet'}
          tone={device?.batteryLevel != null ? (device.batteryLevel < 20 ? 'orange' : 'green') : 'grey'}
        />
        <StatusCard
          style={styles.gridItem}
          icon="wine-outline"
          title="Alcohol Detection"
          value="Not available yet"
          subtitle="Reserved for a future sensor"
          tone="grey"
        />
      </View>

      {/* Location preview (map-style card; no phone location is used) */}
      <Text style={styles.section}>Helmet location</Text>
      <View style={[styles.card, shadows.card]}>
        {validCoords ? (
          <>
            <View style={styles.mapBox} accessibilityLabel="Map preview of the last helmet position">
              {[25, 50, 75].map((p) => (
                <View key={`h${p}`} style={[styles.gridLineH, { top: `${p}%` }]} />
              ))}
              {[25, 50, 75].map((p) => (
                <View key={`v${p}`} style={[styles.gridLineV, { left: `${p}%` }]} />
              ))}
              <Ionicons name="location-sharp" size={40} color={colors.red} />
            </View>
            <Text style={styles.coords}>
              {formatCoord(device.latitude)}, {formatCoord(device.longitude)}
            </Text>
            <Text style={styles.meta}>Last GPS fix: {timeAgo(device.gpsLastFixAt)}</Text>
            <AppButton title="Open Location tab" variant="secondary" icon="map-outline" onPress={() => navigation.navigate('Location')} style={styles.btnGap} />
          </>
        ) : (
          <EmptyState
            icon="location-outline"
            title="No valid GPS location"
            message="The helmet has not reported a valid GPS fix yet. Nothing is shown on the map until it does."
            actionLabel="Open Location tab"
            onAction={() => navigation.navigate('Location')}
          />
        )}
      </View>

      {/* Latest alert */}
      <Text style={styles.section}>Latest accident alert</Text>
      {latest ? (
        <Pressable style={[styles.card, shadows.card]} onPress={() => openAlert(latest.id)} accessibilityRole="button">
          <View style={styles.rowBetween}>
            <StatusBadge label={`${latest.severity} severity`} tone={severityTone(latest.severity)} />
            <StatusBadge label={latest.status} tone={latest.status === 'resolved' ? 'green' : 'orange'} />
          </View>
          <Text style={styles.coords}>{formatDateTime(latest.timestamp)}</Text>
          <StatusBadge label={smsLabel(latest.smsStatus).label} tone={smsLabel(latest.smsStatus).tone} style={styles.btnGap} />
        </Pressable>
      ) : (
        <View style={[styles.card, shadows.card]}>
          <EmptyState icon="shield-checkmark-outline" title="No alerts yet" message="Accident alerts from the helmet will appear here." />
        </View>
      )}

      {/* Recent history */}
      <Text style={styles.section}>Recent alert history</Text>
      <View style={[styles.card, shadows.card]}>
        {recent.length === 0 ? (
          <Text style={styles.meta}>No history yet.</Text>
        ) : (
          recent.map((a, i) => {
            const t = getTone(severityTone(a.severity));
            return (
              <Pressable
                key={a.id}
                onPress={() => openAlert(a.id)}
                style={[styles.historyRow, i < recent.length - 1 && styles.divider]}
                accessibilityRole="button"
              >
                <View style={[styles.dot, { backgroundColor: t.fg }]} />
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{formatDateTime(a.timestamp)}</Text>
                  <Text style={styles.meta}>
                    {a.severity} · {a.status} · {smsLabel(a.smsStatus).label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.grey} />
              </Pressable>
            );
          })
        )}
      </View>

      {/* Last coordinates + communication */}
      <Text style={styles.section}>Device report</Text>
      <View style={[styles.card, shadows.card]}>
        <View style={styles.kv}>
          <Text style={styles.meta}>Last latitude</Text>
          <Text style={styles.rowTitle}>{formatCoord(device?.latitude)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.meta}>Last longitude</Text>
          <Text style={styles.rowTitle}>{formatCoord(device?.longitude)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.meta}>Last device communication</Text>
          <Text style={styles.rowTitle}>{timeAgo(device?.lastUpdated)}</Text>
        </View>
        {!validCoords && device?.latitude != null ? (
          <Text style={styles.warn}>These coordinates are not a valid GPS fix and are not shown on a map.</Text>
        ) : null}
      </View>

      {/* Contacts quick access */}
      <Text style={styles.section}>Emergency contacts</Text>
      <View style={[styles.card, shadows.card]}>
        {sortedContacts.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No contacts yet"
            message="Add someone to notify in an emergency."
            actionLabel="Add contacts"
            onAction={() => navigation.navigate('Contacts')}
          />
        ) : (
          sortedContacts.slice(0, 2).map((c, i, arr) => (
            <View key={c.id} style={[styles.historyRow, i < arr.length - 1 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>
                  {c.name}
                  {c.isPrimary ? '  ·  Primary' : ''}
                </Text>
                <Text style={styles.meta}>{c.phone}</Text>
              </View>
              <Pressable style={styles.callBtn} onPress={() => call(c.phone)} accessibilityRole="button" accessibilityLabel={`Call ${c.name}`}>
                <Ionicons name="call" size={20} color={colors.white} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Helmet switch popup: opens when the Helmet Status card is tapped */}
      <HelmetPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  headerText: { flex: 1 },
  appName: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 2 },
  iconBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  bell: { position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  demo: { marginBottom: spacing.md },
  emergency: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.red, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  emergencyText: { flex: 1, marginHorizontal: spacing.md },
  emergencyTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  emergencySub: { color: colors.white, fontSize: 13, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48.5%', marginBottom: spacing.md },
  section: { ...typography.heading, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  mapBox: { height: 140, borderRadius: radius.md, backgroundColor: '#DCE8F7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#C3D4EC' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#C3D4EC' },
  coords: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: spacing.md },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  warn: { fontSize: 12, color: colors.orange, marginTop: spacing.sm },
  btnGap: { marginTop: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 8, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  callBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});