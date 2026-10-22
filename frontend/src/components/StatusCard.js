import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadows, spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { getTone } from '../theme/colors';

export default function StatusCard({ icon, title, value, subtitle, tone = 'grey', onPress, style }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const t = getTone(tone, isDark);
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.card, shadows.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.value, { color: t.fg }]} numberOfLines={2}>
        {value}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 120,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  subtitle: { fontSize: 11, marginTop: 2 },
});
