import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { spacing, typography } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

export default function EmptyState({ icon = 'information-circle-outline', title, message, actionLabel, onAction, style }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1E293B' : colors.greySoft }]}>
        <Ionicons name={icon} size={30} color={colors.textSecondary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} variant="secondary" style={styles.btn} />
      ) : null}
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
