// Primary button. variant: 'primary' | 'secondary' | 'danger' | 'navy' | 'ghost'.
// Follows Kavach Safety-Tech design tokens. Min height 48 (>= 44 touch target).
// Dynamic Theme-aware component.

import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, spacing } from '../theme/index.js';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const { colors, isDark } = useTheme();

  const VARIANTS = {
    primary: {
      bg: colors.safetyTeal,
      fg: colors.white,
      border: colors.safetyTeal,
    },
    secondary: {
      bg: isDark ? colors.cardElevated : colors.card,
      fg: colors.text,
      border: colors.border,
    },
    danger: {
      bg: colors.emergency,
      fg: colors.white,
      border: colors.emergency,
    },
    navy: {
      bg: isDark ? colors.cardElevated : colors.midnightNavy,
      fg: colors.white,
      border: isDark ? colors.border : colors.midnightNavy,
    },
    ghost: {
      bg: 'transparent',
      fg: colors.safetyTeal,
      border: 'transparent',
    },
  };

  const v = VARIANTS[variant] || VARIANTS.primary;
  const inactive = disabled || loading;

  const sizeStyle = size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;
  const textSizeStyle = size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        sizeStyle,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} style={styles.icon} /> : null}
          <Text style={[styles.text, textSizeStyle, { color: v.fg }, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  btnMd: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  btnLg: {
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
