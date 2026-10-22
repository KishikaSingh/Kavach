// Settings-style row. Provide onPress (navigates/acts), `right` (e.g. a Switch), or neither (info row).
// `comingSoon` greys the row and shows a label; it is never tappable.
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { spacing, MIN_TOUCH } from '../constants/theme';

export default function ProfileRow({ icon, label, value, onPress, right, comingSoon = false, last = false }) {
  const { colors } = useTheme();
  const tappable = !!onPress && !comingSoon;
  const Wrapper = tappable ? Pressable : View;

  return (
    <Wrapper
      onPress={tappable ? onPress : undefined}
      accessibilityRole={tappable ? 'button' : undefined}
      style={[
        styles.row,
        !last && [styles.divider, { borderBottomColor: colors.border }],
        comingSoon && styles.dim,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={colors.safetyTeal} style={styles.icon} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {value ? (
          <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={2}>
            {value}
          </Text>
        ) : null}
      </View>
      {comingSoon ? <Text style={[styles.soon, { color: colors.textMuted }]}>Coming soon</Text> : null}
      {right || null}
      {tappable ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 12,
    paddingVertical: spacing.sm + 2,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dim: {
    opacity: 0.5,
  },
  icon: {},
  body: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    marginTop: 2,
  },
  soon: {
    fontSize: 11,
    fontWeight: '700',
  },
});
