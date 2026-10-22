// Compact MetricCard for Dashboard telemetry and status metrics.
// Dynamic Theme-aware component with guaranteed surface rendering.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { typography } from '../theme/typography.js';
import { shadows, spacing } from '../theme/index.js';

export default function MetricCard({
  icon,
  label,
  value = 'Unavailable',
  sublabel,
  tone = 'teal',
  onPress,
  style,
}) {
  const { colors, getTone } = useTheme();
  const isPressable = typeof onPress === 'function';
  const t = getTone(tone);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    shadows.card,
    style,
  ];

  const content = (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={20} color={t.fg} />
        </View>
        <Text style={[styles.statusTag, { color: t.fg }]}>{value}</Text>
      </View>

      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: colors.textSecondary }]} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </>
  );

  if (isPressable) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
      style={cardStyle}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    maxWidth: '65%',
    textAlign: 'right',
  },
  label: {
    ...typography.cardTitle,
    fontSize: 14,
  },
  sublabel: {
    ...typography.supporting,
    fontSize: 12,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
