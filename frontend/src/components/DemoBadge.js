// Shown whenever dataSource === 'demo' so simulated values are never mistaken for real readings.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

export default function DemoBadge({ style }) {
  return (
    <View style={[styles.badge, style]} accessibilityLabel="Demo data">
      <Text style={styles.text}>DEMO DATA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { color: colors.orange, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
