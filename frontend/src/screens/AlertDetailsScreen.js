import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAlerts } from '../hooks/useAlerts.js';
import { LocationPreview } from '../components/LocationPreview.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import { EmergencyDispatchBanner } from '../components/EmergencyDispatchBanner.js';
import { colors, space, type } from '../components/person2Theme.js';
import { formatDateTime, relativeTime } from '../utils/formatTime.js';

const SMS_COPY = {
  pending: 'Emergency SMS is still pending.',
  confirmed: 'Emergency SMS was confirmed.',
  failed: 'Emergency SMS failed to send.',
  unknown: 'Emergency SMS status is unknown.',
};

const STATUS_COPY = {
  new: 'New — not resolved',
  sent: 'Sent — not resolved',
  resolved: 'Resolved',
};

export function AlertDetailsScreen({ route, navigation }) {
  const alertId = route?.params?.alertId;
  const { alerts, loading, error, retry, resolveAlert } = useAlerts();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const alert = useMemo(() => (alerts || []).find((a) => a.id === alertId) || null, [alerts, alertId]);

  const confirmResolve = () => {
    if (!alert || alert.status === 'resolved' || busy) return;
    Alert.alert(
      'Mark as resolved?',
      'Only do this after you have handled the situation. Opening this screen did not resolve the alert.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as resolved',
          onPress: async () => {
            setBusy(true);
            setActionError(null);
            try {
              await resolveAlert(alert.id);
            } catch (e) {
              setActionError(e?.message || 'Could not resolve this alert.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !alert) return <LoadingState label="Loading alert" />;
  if (error && !alert) return <ErrorState error={error} onRetry={retry} />;
  if (!alertId) {
    return (
      <EmptyState
        title="No alert selected"
        body="Open an alert from the list."
        actionLabel="Back to alerts"
        onAction={() => navigation?.goBack?.()}
      />
    );
  }
  if (!alert) {
    return (
      <EmptyState
        title="Alert not found"
        body="It may have been removed, or the link is out of date."
        actionLabel="Back to alerts"
        onAction={() => navigation?.goBack?.()}
      />
    );
  }

  const resolved = alert.status === 'resolved';
  const gpsStatus = alert.gpsValid ? 'available' : 'unavailable';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={type.title} accessibilityRole="header">
        Alert details
      </Text>
      <Text style={type.subtitle}>
        {(alert.severity || 'medium').toUpperCase()} · {STATUS_COPY[alert.status] || alert.status}
      </Text>
      <Text style={type.muted}>
        {formatDateTime(alert.timestamp)} ({relativeTime(alert.timestamp)})
      </Text>

      <StatusBanner tone={alert.smsStatus === 'failed' ? 'danger' : 'info'}>
        {SMS_COPY[alert.smsStatus] || SMS_COPY.unknown}
      </StatusBanner>

      <EmergencyDispatchBanner
        alert={alert}
        onAddContacts={() => navigation?.navigate?.('Contacts')}
      />

      {actionError ? <StatusBanner tone="danger">{actionError}</StatusBanner> : null}

      <LocationPreview
        latitude={alert.latitude}
        longitude={alert.longitude}
        gpsValid={alert.gpsValid === true}
        gpsStatus={gpsStatus}
        timestampLabel="Position recorded with this alert"
      />

      <Text style={[type.muted, styles.note]}>
        Viewing this alert does not mark it resolved. Use the button below only after you have responded.
      </Text>

      <Pressable
        onPress={confirmResolve}
        disabled={resolved || busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: resolved || busy }}
        accessibilityLabel={resolved ? 'Alert already resolved' : 'Mark alert as resolved'}
        style={[styles.resolve, (resolved || busy) && styles.disabled]}
      >
        <Text style={styles.resolveText}>
          {resolved ? 'Already resolved' : busy ? 'Saving…' : 'Mark as resolved'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: 40, gap: space.sm },
  note: { marginTop: space.sm },
  resolve: {
    marginTop: space.md,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  disabled: { backgroundColor: colors.cardAlt },
  resolveText: { color: colors.text, fontWeight: '700' },
});

export default AlertDetailsScreen;
