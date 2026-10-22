// One row in the Notifications list. `demo` adds a Demo label (a local notification
// does not prove a real hardware event).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, getTone, radius, shadows, spacing } from '../constants/theme';
import { timeAgo } from '../utils/formatTime';

const TYPE_META = {
  accident: { icon: 'alert-circle', tone: 'red', label: 'Accident' },
  disconnected: { icon: 'bluetooth-outline', tone: 'orange', label: 'Helmet' },
  gps: { icon: 'location-outline', tone: 'orange', label: 'GPS' },
  sensor: { icon: 'hardware-chip-outline', tone: 'orange', label: 'Sensor' },
  alertUpdate: { icon: 'checkmark-circle-outline', tone: 'green', label: 'Alert update' },
};

export default function NotificationItem({ item, demo, onPress }) {
  const meta = TYPE_META[item.type] || { icon: 'notifications-outline', tone: 'grey', label: 'Notice' };
  const t = getTone(meta.tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.read ? 'Read' : 'Unread'}`}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        !item.read && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={meta.icon} size={22} color={t.fg} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read ? <View style={styles.dot} /> : null}
        </View>
        {item.body ? (
          <Text style={styles.text} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{meta.label}</Text>
          <Text style={styles.meta}> · {timeAgo(item.timestamp)}</Text>
          {demo ? <Text style={styles.demo}> · Demo</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 68,
    alignItems: 'center',
  },
  unread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.safetyTeal,
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.midnightNavy,
  },
  titleUnread: {
    fontWeight: '800',
    color: colors.midnightNavy,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.safetyTeal,
    marginLeft: spacing.sm,
  },
  text: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  demo: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
});
