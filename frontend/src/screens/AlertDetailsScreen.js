import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlerts } from '../hooks/useAlerts.js';
import { LocationPreview } from '../components/LocationPreview.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import { EmergencyDispatchBanner } from '../components/EmergencyDispatchBanner.js';
import ScreenHeader from '../components/ScreenHeader.js';
import StatusBadge from '../components/StatusBadge.js';
import AppCard from '../components/AppCard.js';
import AppButton from '../components/AppButton.js';
import ConfirmationDialog from '../components/ConfirmationDialog.js';
import { radius, shadows, spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme.js';
import { formatDateTime, relativeTime } from '../utils/formatTime.js';

const SMS_COPY = {
  pending: 'Emergency SMS is pending hardware delivery.',
  confirmed: 'Emergency SMS confirmed sent to primary contacts.',
  failed: 'Emergency SMS failed to send via GSM module.',
  unknown: 'Emergency SMS delivery status is unknown.',
};

const STATUS_COPY = {
  new: 'Active Impact',
  sent: 'Emergency Broadcast Sent',
  resolved: 'Incident Resolved',
};

export function AlertDetailsScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const alertId = route?.params?.alertId;
  const { alerts, loading, error, retry, resolveAlert } = useAlerts();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const alert = useMemo(() => (alerts || []).find((a) => a.id === alertId) || null, [alerts, alertId]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleResolveAction = async () => {
    setShowConfirm(false);
    if (!alert || alert.status === 'resolved' || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await resolveAlert(alert.id);
    } catch (e) {
      setActionError(e?.message || 'Could not resolve this alert.');
    } finally {
      setBusy(false);
    }
  };

  const confirmResolve = () => {
    if (!alert || alert.status === 'resolved' || busy) return;
    setShowConfirm(true);
  };

  if (loading && !alert) return <LoadingState label="Loading alert…" />;
  if (error && !alert) return <ErrorState error={error} onRetry={retry} />;

  if (!alertId) {
    return (
      <View style={styles.fallbackScreen}>
        <EmptyState
          title="No alert selected"
          body="Please select an alert from the safety log list."
          actionLabel="Back to Alerts"
          onAction={() => navigation?.goBack?.()}
        />
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={styles.fallbackScreen}>
        <EmptyState
          title="Alert record not found"
          body="It may have been purged or the reference link is invalid."
          actionLabel="Back to Alerts"
          onAction={() => navigation?.goBack?.()}
        />
      </View>
    );
  }

  const resolved = alert.status === 'resolved';
  const gpsStatus = alert.gpsValid ? 'available' : 'unavailable';
  const severity = alert.severity || 'medium';
  const isEmergency = severity === 'high' || alert.status === 'new';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Alert Details"
        subtitle={`Incident ID #${alert.id.slice(-6)}`}
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Incident Hero Card */}
        <AppCard
          variant={isEmergency && !resolved ? 'emergency' : 'default'}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconWrap, { backgroundColor: isEmergency && !resolved ? 'rgba(229, 72, 77, 0.15)' : 'rgba(0, 184, 169, 0.12)' }]}>
              <Ionicons
                name={isEmergency && !resolved ? 'alert-circle' : 'shield-checkmark'}
                size={26}
                color={isEmergency && !resolved ? colors.emergency : colors.safetyTeal}
              />
            </View>
            <View style={styles.heroTitles}>
              <Text style={styles.heroTitle}>{STATUS_COPY[alert.status] || alert.status}</Text>
              <Text style={styles.heroSeverity}>
                {severity.toUpperCase()} SEVERITY IMPACT
              </Text>
            </View>
            <StatusBadge
              label={resolved ? 'Resolved' : 'Active'}
              tone={resolved ? 'green' : 'red'}
            />
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.timeText}>
              {formatDateTime(alert.timestamp)} ({relativeTime(alert.timestamp)})
            </Text>
          </View>
        </AppCard>

        {/* SMS Status Banner */}
        <StatusBanner tone={alert.smsStatus === 'failed' ? 'danger' : alert.smsStatus === 'confirmed' ? 'success' : 'info'}>
          {SMS_COPY[alert.smsStatus] || SMS_COPY.unknown}
        </StatusBanner>

        {/* Emergency Dispatch Banner */}
        <EmergencyDispatchBanner
          alert={alert}
          onAddContacts={() => navigation?.navigate?.('Contacts')}
        />

        {actionError ? <StatusBanner tone="danger">{actionError}</StatusBanner> : null}

        {/* Location Preview Card */}
        <LocationPreview
          latitude={alert.latitude}
          longitude={alert.longitude}
          gpsValid={alert.gpsValid === true}
          gpsStatus={gpsStatus}
          timestampLabel="Position recorded with this alert"
        />

        {/* Resolution Notice & Actions */}
        <View style={styles.resolveSection}>
          <Text style={styles.resolveNotice}>
            Viewing this alert does not mark it resolved. Only mark as resolved after confirming rider safety and handling the situation.
          </Text>

          <AppButton
            title={resolved ? 'Incident Resolved' : busy ? 'Resolving…' : 'Mark as Resolved'}
            variant={resolved ? 'secondary' : 'primary'}
            icon={resolved ? 'checkmark-circle-outline' : 'shield-checkmark-outline'}
            onPress={confirmResolve}
            disabled={resolved || busy}
            loading={busy}
            style={styles.resolveBtn}
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={showConfirm}
        title="Resolve Incident Alert?"
        message="Only mark this alert as resolved once you have verified the rider's condition and completed emergency response."
        confirmLabel="Mark as Resolved"
        cancelLabel="Cancel"
        onConfirm={handleResolveAction}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  fallbackScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroTitles: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  heroSeverity: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resolveSection: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  resolveNotice: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  resolveBtn: {
    width: '100%',
  },
});

export default AlertDetailsScreen;
