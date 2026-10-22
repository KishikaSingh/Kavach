// One row in the Notifications list. `demo` adds a Demo label (a local notification
// does not prove a real hardware event).
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, shadows, spacing } from '../constants/theme';
import { timeAgo } from '../utils/formatTime';

const TYPE_META = {
  accident: { icon: 'alert-circle', tone: 'red', label: 'Accident' },
  disconnected: { icon: 'bluetooth-outline', tone: 'orange', label: 'Helmet' },
  gps: { icon: 'location-outline', tone: 'orange', label: 'GPS' },
  sensor: { icon: 'hardware-chip-outline', tone: 'orange', label: 'Sensor' },
  alertUpdate: { icon: 'checkmark-circle-outline', tone: 'green', label: 'Alert update' },
};

export default function NotificationItem({ item, demo, onPress }) {
  const { colors, getTone } = useTheme();
  const meta = TYPE_META[item.type] || { icon: 'notifications-outline', tone: 'grey', label: 'Notice' };
  const t = getTone(meta.tone);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.read ? 'Read' : 'Unread'}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        shadows.sm,
        !item.read && [styles.unread, { borderLeftColor: colors.safetyTeal }],
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={meta.icon} size={22} color={t.fg} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
              !item.read && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read ? <View style={[styles.dot, { backgroundColor: colors.safetyTeal }]} /> : null}
        </View>
        {item.body ? (
          <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{meta.label}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}> · {timeAgo(item.timestamp)}</Text>
          {demo ? <Text style={[styles.demo, { color: colors.warning }]}> · Demo</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 68,
    alignItems: 'center',
  },
  unread: {
    borderLeftWidth: 4,
  },
  pressed: {
    opacity: 0.88,
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
  },
  titleUnread: {
    fontWeight: '800',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  text: {
    fontSize: 13,
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
  },
  demo: {
    fontSize: 11,
    fontWeight: '700',
  },
});
