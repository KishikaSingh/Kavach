// Compact MetricCard for Dashboard telemetry and status metrics.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, getTone, radius, shadows, spacing, typography } from '../theme/index.js';

export default function MetricCard({
  icon,
  label,
  value = 'Unavailable',
  sublabel,
  tone = 'teal',
  onPress,
  style,
}) {
  const isPressable = typeof onPress === 'function';
  const Container = isPressable ? Pressable : View;
  const t = getTone(tone);

  return (
    <Container
      onPress={onPress}
      accessibilityRole={isPressable ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        styles.card,
        shadows.card,
        pressed && isPressable && styles.pressed,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={20} color={t.fg} />
        </View>
        <Text style={[styles.statusTag, { color: t.fg }]}>{value}</Text>
      </View>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={styles.sublabel} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  label: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.text,
  },
  sublabel: {
    ...typography.supporting,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
