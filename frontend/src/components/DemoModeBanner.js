// Clear Demo Mode Banner for Dashboard and other screens when running in demo mode.
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, spacing } from '../theme/index.js';

export default function DemoModeBanner({ label = 'DEMO MODE — Simulated device data', style }) {
  const { isDark } = useTheme();

  const bg = isDark ? '#451A03' : '#FEF3DC';
  const border = isDark ? '#D97706' : '#FCD34D';
  const text = isDark ? '#FBBF24' : '#92400E';

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: bg,
          borderColor: border,
        },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={label}
    >
      <Ionicons name="flask-outline" size={16} color={text} style={styles.icon} />
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
