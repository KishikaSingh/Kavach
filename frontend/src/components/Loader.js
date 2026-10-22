import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

export default function Loader({ message = 'Loading…' }) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  text: { marginTop: spacing.md, fontSize: 14 },
});
