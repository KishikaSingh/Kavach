// Summary tile used in the Dashboard grid. Pass onPress only if the tile really navigates somewhere.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, getTone, radius, shadows, spacing } from '../constants/theme';

export default function StatusCard({ icon, title, value, subtitle, tone = 'grey', onPress, style }) {
  const t = getTone(tone);
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.card, shadows.card, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.value, { color: t.fg }]} numberOfLines={2}>
        {value}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 120,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 12, fontWeight: '600', color: colors.muted },
  value: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  subtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
