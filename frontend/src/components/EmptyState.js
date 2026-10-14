// Friendly empty / informative state. The action button is only rendered when onAction is provided,
// so nothing looks tappable without doing something.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, spacing, typography } from '../constants/theme';

export default function EmptyState({ icon = 'information-circle-outline', title, message, actionLabel, onAction, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.grey} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
    backgroundColor: colors.greySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.body, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  btn: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
