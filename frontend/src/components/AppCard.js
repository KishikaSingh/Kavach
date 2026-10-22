// Kavach Reusable AppCard Component
// Dynamic Theme-aware card container supporting 'default', 'hero', 'surface', 'outlined', 'teal', and 'emergency' variants.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.js';
import { shadows, spacing } from '../theme/index.js';

export default function AppCard({
  children,
  variant = 'default',
  onPress,
  style,
  contentStyle,
  accessibilityRole,
  accessibilityLabel,
}) {
  const { colors, isDark } = useTheme();
  const isPressable = typeof onPress === 'function';

  const dynamicStyles = {
    default: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
    },
    hero: {
      backgroundColor: isDark ? colors.cardElevated : colors.card,
      borderColor: isDark ? colors.border : colors.border,
      borderWidth: 1,
      borderRadius: 20,
    },
    surface: {
      backgroundColor: colors.mutedSurface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
      borderWidth: 1.5,
    },
    teal: {
      backgroundColor: colors.primarySoft,
      borderColor: isDark ? colors.primary : '#B2EBF2',
      borderWidth: 1,
    },
    emergency: {
      backgroundColor: colors.emergencySurface,
      borderColor: colors.emergencyBorder,
      borderWidth: 1,
    },
  };

  const selectedVariantStyle = dynamicStyles[variant] || dynamicStyles.default;

  const cardStyle = [
    styles.base,
    selectedVariantStyle,
    shadows.card,
    style,
  ];

  if (isPressable) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole || 'button'}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        <View style={[styles.inner, contentStyle]}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  inner: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
});
