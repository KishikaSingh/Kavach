// Section Header with optional action button.
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.js';
import { spacing, typography } from '../theme/index.js';

export default function SectionHeader({ title, actionLabel, onAction, style }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: colors.safetyTeal }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
