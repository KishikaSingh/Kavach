// One health row (label + value + status icon + optional note) for the Device Settings screen.
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, shadows, spacing } from '../constants/theme';

export default function DeviceHealthCard({
  icon = 'help-circle-outline',
  label = 'Unknown',
  value = 'Unavailable',
  tone = 'grey',
  note,
}) {
  const { colors, getTone } = useTheme();
  const safeTone = tone || 'grey';
  const t = getTone(safeTone);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows.sm]}>
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon || 'help-circle-outline'} size={20} color={t.fg} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.text }]}>{label || 'Unknown'}</Text>
        {note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text> : null}
      </View>
      <StatusBadge label={value ?? 'Unavailable'} tone={safeTone} style={styles.badge} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 60,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    maxWidth: '42%',
  },
});
