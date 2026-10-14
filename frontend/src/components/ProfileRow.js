// Settings-style row. Provide onPress (navigates/acts), `right` (e.g. a Switch), or neither (info row).
// `comingSoon` greys the row and shows a label; it is never tappable.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, MIN_TOUCH } from '../constants/theme';

export default function ProfileRow({ icon, label, value, onPress, right, comingSoon = false, last = false }) {
  const tappable = !!onPress && !comingSoon;
  const Wrapper = tappable ? Pressable : View;
  return (
    <Wrapper
      onPress={tappable ? onPress : undefined}
      accessibilityRole={tappable ? 'button' : undefined}
      style={[styles.row, !last && styles.divider, comingSoon && styles.dim]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.icon} />
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        {value ? (
          <Text style={styles.value} numberOfLines={2}>
            {value}
          </Text>
        ) : null}
      </View>
      {comingSoon ? <Text style={styles.soon}>Coming soon</Text> : null}
      {right || null}
      {tappable ? <Ionicons name="chevron-forward" size={18} color={colors.grey} /> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 12, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dim: { opacity: 0.6 },
  icon: { width: 32 },
  body: { flex: 1, paddingRight: spacing.sm },
  label: { fontSize: 15, fontWeight: '600', color: colors.navy },
  value: { fontSize: 13, color: colors.muted, marginTop: 2 },
  soon: { fontSize: 11, fontWeight: '700', color: colors.grey },
});
