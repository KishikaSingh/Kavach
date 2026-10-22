// Kavach Reusable AppCard Component
// Supports 'default' (white card with subtle border), 'hero' (midnight navy container), and 'surface' styles.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/index.js';

export default function AppCard({
  children,
  variant = 'default',
  onPress,
  style,
  contentStyle,
  accessibilityRole,
  accessibilityLabel,
}) {
  const isPressable = typeof onPress === 'function';
  const Container = isPressable ? Pressable : View;

  const cardStyle = [
    styles.base,
    variant === 'hero' && styles.hero,
    variant === 'surface' && styles.surface,
    variant === 'outlined' && styles.outlined,
    variant === 'teal' && styles.teal,
    variant === 'emergency' && styles.emergency,
    variant === 'default' && styles.default,
    shadows.card,
    style,
  ];

  return (
    <Container
      onPress={onPress}
      accessibilityRole={accessibilityRole || (isPressable ? 'button' : undefined)}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [cardStyle, pressed && isPressable && styles.pressed]}
    >
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    backgroundColor: colors.midnightNavy,
    borderWidth: 1,
    borderColor: colors.deepNavy,
    borderRadius: radius.xl,
  },
  surface: {
    backgroundColor: colors.mutedSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  teal: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  emergency: {
    backgroundColor: colors.emergencySoft,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  inner: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
});
