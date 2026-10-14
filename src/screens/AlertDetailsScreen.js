// Details for one alert.
// Opened with navigation.navigate('AlertDetails', { alertId }).
// Opening this screen never changes the alert. Only the "Mark as resolved"
// button does, after a confirmation. SMS is "delivered" only when confirmed.
import React from 'react';
import { View, Text, Alert, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import DemoBadge from '../components/DemoBadge';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';

import useAlerts from '../hooks/useAlerts';
import useDevice from '../hooks/useDevice';

import {
  colors,
  getTone,
  radius,
  shadows,
  spacing,
  typography,
} from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import {
  formatCoord,
  hasValidCoords,
  severityTone,
  smsLabel,
} from '../utils/deviceStatus';

const STATUS_TONE = { new: 'red', sent: 'orange', resolved: 'green' };

const SMS_HELP = {
  confirmed: 'The SMS network confirmed delivery to the emergency contact.',
  pending: 'The SMS was handed to the network. Delivery is not confirmed yet.',
  failed: 'The SMS could not be sent. Call your emergency contact directly.',
  unknown: 'The helmet has not reported whether the SMS was delivered.',
};

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function AlertDetailsScreen({ navigation, route }) {
  const alertId = route?.params?.alertId;
  const { alerts, loading, error, resolveAlert } = useAlerts();
  const { dataSource } = useDevice();
  const alert = alerts.find((a) => a.id === alertId);

  if (loading && alerts.length === 0) {
    return (
      <ScreenContainer edges={['bottom']}>
        <Loader />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorState message={String(error.message || error)} />
      </ScreenContainer>
    );
  }

  if (!alert) {
    return (
      <ScreenContainer edges={['bottom']}>
        <EmptyState
          icon="alert-circle-outline"
          title="Alert not found"
          message="This alert may have been removed."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const tone = getTone(severityTone(alert.severity));
  const sms = smsLabel(alert.smsStatus);
  const validCoords = hasValidCoords(alert);

  const confirmResolve = () =>
    Alert.alert(
      'Mark as resolved',
      'Only do this when the rider is safe and help is no longer needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark resolved', onPress: () => resolveAlert(alert.id) },
      ]
    );

  const openMaps = async () => {
    const point = `${alert.latitude},${alert.longitude}`;
    const url = `https://www.google.com/maps?q=${point}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Unable to open maps', 'No app could open this location.');
    }
  };

  return (
    <ScreenContainer edges={['bottom']}>
      {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

      <View style={[styles.hero, { backgroundColor: tone.bg }]}>
        <Ionicons name="alert-circle" size={44} color={tone.fg} />
        <Text style={[styles.heroTitle, { color: tone.fg }]}>
          {alert.severity.toUpperCase()} SEVERITY
        </Text>
        <Text style={styles.heroTime}>{formatDateTime(alert.timestamp)}</Text>
        <Text style={styles.meta}>{timeAgo(alert.timestamp)}</Text>
        <StatusBadge
          label={alert.status}
          tone={STATUS_TONE[alert.status] || 'grey'}
          style={styles.heroBadge}
        />
      </View>

      <Text style={styles.section}>SMS to emergency contact</Text>
      <View style={[styles.card, shadows.card]}>
        <StatusBadge label={sms.label} tone={sms.tone} />
        <Text style={styles.help}>
          {SMS_HELP[alert.smsStatus] || SMS_HELP.unknown}
        </Text>
      </View>

      <Text style={styles.section}>Helmet location</Text>
      <View style={[styles.card, shadows.card]}>
        {validCoords ? (
          <>
            <Row label="Latitude" value={formatCoord(alert.latitude)} />
            <Row label="Longitude" value={formatCoord(alert.longitude)} last />
            <AppButton
              title="Open in maps"
              icon="map-outline"
              variant="secondary"
              onPress={openMaps}
              style={styles.btn}
            />
          </>
        ) : (
          <Text style={styles.help}>
            The helmet had no valid GPS fix when this alert was raised, so no
            location is shown.
          </Text>
        )}
      </View>

      <Text style={styles.section}>Details</Text>
      <View style={[styles.card, shadows.card]}>
        <Row label="Alert ID" value={alert.id} />
        <Row label="Severity" value={alert.severity} />
        <Row label="Status" value={alert.status} last />
      </View>

      {alert.status !== 'resolved' ? (
        <AppButton
          title="Mark as resolved"
          icon="checkmark-circle-outline"
          onPress={confirmResolve}
          style={styles.resolve}
        />
      ) : (
        <View style={styles.done}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          <Text style={styles.doneText}>This alert is resolved.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  demo: { marginBottom: spacing.md },
  hero: {
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
  heroTime: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginTop: spacing.sm,
  },
  heroBadge: { marginTop: spacing.md },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  section: {
    ...typography.heading,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  help: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
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
  btn: { marginTop: spacing.md },
  resolve: { marginTop: spacing.xl },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
    marginLeft: spacing.sm,
  },
});