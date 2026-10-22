import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { spacing, typography } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={[styles.iconWrap, { backgroundColor: isDark ? '#450A0A' : colors.redSoft }]}>
        <Ionicons name="warning-outline" size={30} color={colors.red} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Couldn&apos;t load data</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry ? <AppButton title="Retry" icon="refresh" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: spacing.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  btn: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
