import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { getTone } from '../theme/colors';

export default function DemoBadge({ style }) {
  const { isDark } = useTheme();
  const tone = getTone('yellow', isDark);
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone.bg, borderColor: tone.border },
        style,
      ]}
      accessibilityLabel="Demo data"
    >
      <Text style={[styles.text, { color: tone.fg }]}>DEMO DATA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
