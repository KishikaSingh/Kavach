// The "DEMO DATA" badge is hidden for now. To show it again, set SHOW_DEMO_BADGE to true.
// The app still tracks dataSource === 'demo' internally; only the label is hidden.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

const SHOW_DEMO_BADGE = false;

export default function DemoBadge({ style }) {
  if (!SHOW_DEMO_BADGE) return null;
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