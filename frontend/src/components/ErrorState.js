import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, spacing, typography } from '../constants/theme';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="warning-outline" size={30} color={colors.red} />
      </View>
      <Text style={styles.title}>Couldn&apos;t load data</Text>
      <Text style={styles.message}>{message}</Text>
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
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.body, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  btn: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
