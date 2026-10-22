// Clear Demo Mode Banner for Dashboard and other screens when running in demo mode.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../theme/index.js';

export default function DemoModeBanner({ label = 'DEMO MODE — Simulated device data', style }) {
  return (
    <View style={[styles.banner, style]} accessibilityRole="alert" accessibilityLabel={label}>
      <Ionicons name="flask-outline" size={16} color="#B45309" style={styles.icon} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3DC',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.2,
  },
});
