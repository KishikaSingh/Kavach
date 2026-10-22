import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime, relativeTime } from '../utils/formatTime.js';
import StatusBadge from './StatusBadge.js';
import { colors, radius, shadows, spacing } from '../theme/index.js';

const SMS_COPY = {
  pending: { label: 'SMS Pending', tone: 'orange' },
  confirmed: { label: 'SMS Delivered', tone: 'green' },
  failed: { label: 'SMS Failed', tone: 'red' },
  unknown: { label: 'SMS Unknown', tone: 'grey' },
};

const STATUS_COPY = {
  new: { label: 'Active', tone: 'red' },
  sent: { label: 'Sent', tone: 'orange' },
  resolved: { label: 'Resolved', tone: 'green' },
};

export function AccidentAlertCard({ alert, onPress }) {
  if (!alert) return null;
  const severity = alert.severity || 'medium';
  const severityTone = severity === 'high' ? 'red' : severity === 'medium' ? 'orange' : 'grey';
  const isEmergency = severity === 'high' || alert.status === 'new';

  const gpsLine = alert.gpsValid
    ? 'GPS location acquired'
    : 'No valid GPS fix reported';

  const sms = SMS_COPY[alert.smsStatus] || SMS_COPY.unknown;
  const statusInfo = STATUS_COPY[alert.status] || { label: alert.status, tone: 'grey' };

  return (
    <Pressable
      onPress={() => onPress?.(alert)}
      accessibilityRole="button"
      accessibilityLabel={`${statusInfo.label} ${severity} alert, ${relativeTime(alert.timestamp)}. ${sms.label}.`}
      accessibilityHint="Opens alert details. Viewing does not mark the alert as resolved."
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        isEmergency && styles.emergencyCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <StatusBadge
            label={`${severity.toUpperCase()} SEVERITY`}
            tone={severityTone}
            size="sm"
          />
          <StatusBadge
            label={statusInfo.label}
            tone={statusInfo.tone}
            size="sm"
            style={styles.statusBadgeMargin}
          />
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      <View style={styles.bodyRow}>
        <View style={[styles.iconWrap, { backgroundColor: isEmergency ? 'rgba(229, 72, 77, 0.1)' : 'rgba(0, 184, 169, 0.1)' }]}>
          <Ionicons
            name={isEmergency ? 'alert-circle' : 'shield-checkmark'}
            size={22}
            color={isEmergency ? colors.emergency : colors.safetyTeal}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.timestamp}>{formatDateTime(alert.timestamp)}</Text>
          <Text style={styles.relativeTime}>{relativeTime(alert.timestamp)}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.metaItem}>
          <Ionicons
            name={alert.gpsValid ? 'navigate' : 'navigate-outline'}
            size={13}
            color={alert.gpsValid ? colors.safetyTeal : colors.textMuted}
            style={styles.metaIcon}
          />
          <Text style={styles.metaText} numberOfLines={1}>{gpsLine}</Text>
        </View>
        <StatusBadge label={sms.label} tone={sms.tone} size="sm" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  emergencyCard: {
    borderColor: 'rgba(229, 72, 77, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.emergency,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeMargin: {
    marginLeft: 6,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  timestamp: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.midnightNavy,
  },
  relativeTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default AccidentAlertCard;
