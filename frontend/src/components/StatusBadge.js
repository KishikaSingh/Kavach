// Small coloured pill. tone: 'teal' | 'green' | 'red' | 'orange' | 'grey' | 'blue'.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTone, radius, spacing } from '../theme/index.js';

export default function StatusBadge({ label = 'Unavailable', tone = 'grey', icon, style, textStyle }) {
  const safeTone = tone || 'grey';
  const t = getTone(safeTone);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border || t.bg }, style]}>
      {icon ? (
        <Ionicons name={icon} size={13} color={t.fg} style={styles.icon} />
      ) : (
        <View style={[styles.dot, { backgroundColor: t.fg }]} />
      )}
      <Text style={[styles.text, { color: t.fg }, textStyle]} numberOfLines={1}>
        {label ?? 'Unavailable'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
