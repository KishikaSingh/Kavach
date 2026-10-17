// Demo-only switch for the pretend helmet (bottom-left "Demo" button). Renders nothing in live mode.
// Lets a demo show: normal -> accident alert -> GPS lost -> offline, without hardware.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemoControls } from '../hooks/useDemoControls.js';

const LABELS = {
  normal: 'Normal',
  newAlert: 'New accident alert',
  gpsUnavailable: 'GPS unavailable',
  gpsStale: 'GPS stale',
  offline: 'Helmet offline',
  sensorFault: 'Sensor fault',
  gsmUnregistered: 'SIM not registered',
  backendUnreachable: 'Backend unreachable',
  batterySupported: 'Battery shown',
  emptyDevice: 'Nothing known yet',
};

export function DemoControlsBar() {
  const { isDemo, scenario, scenarios, setScenario } = useDemoControls();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  if (!isDemo) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 70 + insets.bottom }]}>
      {open ? (
        <View style={styles.panel}>
          <Text style={styles.heading}>Pretend helmet situation</Text>
          <ScrollView style={styles.list}>
            {scenarios.map((name) => (
              <Pressable
                key={name}
                onPress={() => setScenario(name)}
                accessibilityRole="button"
                accessibilityLabel={`Demo scenario ${LABELS[name] || name}`}
                style={[styles.item, name === scenario && styles.itemOn]}
              >
                <Text style={[styles.itemText, name === scenario && styles.itemTextOn]}>{LABELS[name] || name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel="Demo controls"
        style={styles.button}
      >
        <Text style={styles.buttonText}>{open ? 'Close' : 'Demo'}</Text>
      </Pressable>
    </View>
  );
}

export default DemoControlsBar;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 8, alignItems: 'flex-start' },
  button: { backgroundColor: '#111827', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, opacity: 0.92 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  panel: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 6, width: 220, maxHeight: 340, borderWidth: 1, borderColor: '#d1d5db' },
  heading: { fontWeight: '700', fontSize: 12, color: '#374151', marginBottom: 6 },
  list: { flexGrow: 0 },
  item: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4, backgroundColor: '#f3f4f6' },
  itemOn: { backgroundColor: '#111827' },
  itemText: { color: '#111827', fontSize: 13 },
  itemTextOn: { color: '#fff', fontWeight: '700' },
});
