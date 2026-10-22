// Section Header with optional action button.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/index.js';

export default function SectionHeader({ title, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
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
    color: colors.text,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.safetyTeal,
  },
});
