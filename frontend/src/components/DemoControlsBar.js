// DemoControlsBar: simple demo mode controls UI
// Shows current demo scenario and provides a button to cycle through scenarios.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme.js';
import { useDemoControls } from '../hooks/useDemoControls.js';

export default function DemoControlsBar() {
  const { isDemo, scenario, scenarios, setScenario } = useDemoControls();

  if (!isDemo) return null;

  const nextScenario = () => {
    if (!scenarios?.length) return;
    const currentIndex = scenarios.indexOf(scenario);
    const nextIndex = (currentIndex + 1) % scenarios.length;
    setScenario(scenarios[nextIndex]);
  };

  return (
    <View style={styles.bar} accessibilityLabel="Demo Controls Bar">
      <Text style={styles.label}>Demo: {scenario || 'none'}</Text>
      <TouchableOpacity onPress={nextScenario} style={styles.button} accessibilityLabel="Next Demo Scenario">
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.grayLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.gray,
  },
  label: {
    color: colors.black,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
