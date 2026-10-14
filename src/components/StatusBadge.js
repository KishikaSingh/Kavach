// Small coloured pill. tone: 'green' | 'red' | 'orange' | 'grey'.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTone, radius, spacing } from '../constants/theme';

export default function StatusBadge({ label, tone = 'grey', style }) {
  const t = getTone(tone);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: t.fg }]} />
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '700' },
});
