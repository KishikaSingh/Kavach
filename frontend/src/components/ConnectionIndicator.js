// Connection indicator with pulse dot and label.
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.js';

export default function ConnectionIndicator({ connected = false, label, showLabel = true, style }) {
  const { colors } = useTheme();
  const isConnected = !!connected;
  const statusColor = isConnected ? colors.safetyTeal : colors.warning;
  const textLabel = label || (isConnected ? 'Connected' : 'Offline');

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.outerDot, { backgroundColor: isConnected ? colors.primarySoft : colors.warningSurface }]}>
        <View style={[styles.innerDot, { backgroundColor: statusColor }]} />
      </View>
      {showLabel ? (
        <Text style={[styles.label, { color: statusColor }]}>
          {textLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
