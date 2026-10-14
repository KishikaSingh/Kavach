import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/theme';

export default function Loader({ message = 'Loading…' }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  text: { marginTop: spacing.md, color: colors.muted, fontSize: 14 },
});
