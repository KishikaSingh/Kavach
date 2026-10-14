// Primary button. variant: 'primary' | 'secondary' | 'danger' | 'ghost'. Min height 48 (>= 44 touch target).
import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.white, fg: colors.primary, border: colors.border },
  danger: { bg: colors.red, fg: colors.white, border: colors.red },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !inactive && { opacity: 0.85 },
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} style={styles.icon} /> : null}
          <Text style={[styles.text, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.sm },
  text: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
