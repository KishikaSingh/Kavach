import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateTime, relativeTime } from '../utils/formatTime.js';
import { colors, space, type } from './person2Theme.js';

const SMS_COPY = {
  pending: 'SMS pending',
  confirmed: 'SMS confirmed',
  failed: 'SMS failed',
  unknown: 'SMS status unknown',
};

const STATUS_COPY = {
  new: 'New',
  sent: 'Sent',
  resolved: 'Resolved',
};

export function AccidentAlertCard({ alert, onPress }) {
  if (!alert) return null;
  const severity = alert.severity || 'medium';
  const tone = colors[severity] || colors.medium;
  const gpsLine = alert.gpsValid
    ? 'GPS was valid'
    : 'GPS was not valid — no coordinates shown';
  const sms = SMS_COPY[alert.smsStatus] || SMS_COPY.unknown;

  return (
    <Pressable
      onPress={() => onPress?.(alert)}
      accessibilityRole="button"
      accessibilityLabel={`${STATUS_COPY[alert.status] || alert.status} ${severity} alert, ${relativeTime(alert.timestamp)}. ${sms}.`}
      accessibilityHint="Opens alert details. Viewing does not mark the alert as resolved."
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: tone }]} />
        <Text style={type.subtitle}>{severity.toUpperCase()} · {STATUS_COPY[alert.status] || alert.status}</Text>
      </View>
      <Text style={type.muted}>{relativeTime(alert.timestamp)} · {formatDateTime(alert.timestamp)}</Text>
      <Text style={[type.muted, styles.meta]}>{gpsLine}</Text>
      <Text style={[type.muted, styles.meta]}>{sms}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  meta: { marginTop: 2 },
});
