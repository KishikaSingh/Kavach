// One health row (label + value + status icon + optional note) for the Device Settings screen.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { colors, getTone, radius, shadows, spacing } from '../constants/theme';

export default function DeviceHealthCard({
  icon = 'help-circle-outline',
  label = 'Unknown',
  value = 'Unavailable',
  tone = 'grey',
  note,
}) {
  const safeTone = tone || 'grey';
  const t = getTone(safeTone);
  return (
    <View style={[styles.card, shadows.card]}>
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon || 'help-circle-outline'} size={20} color={t.fg} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label || 'Unknown'}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      <StatusBadge label={value ?? 'Unavailable'} tone={safeTone} style={styles.badge} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1, paddingRight: spacing.sm },
  label: { fontSize: 14, fontWeight: '700', color: colors.navy },
  note: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: { maxWidth: '40%' },
});
