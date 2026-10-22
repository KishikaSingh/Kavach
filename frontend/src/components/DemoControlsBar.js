// DemoControlsBar: interactive hardware-free demo mode controls
// Clearly labelled banner with telemetry simulation for battery, connectivity, GPS, sensors, and accidents.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/theme.js';
import { useDemoControls } from '../hooks/useDemoControls.js';

export default function DemoControlsBar() {
  const {
    isDemo,
    scenario,
    scenarios,
    setScenario,
    setBattery,
    setConnectivity,
    setGps,
    setSensors,
    triggerAccident,
    resetDemo,
  } = useDemoControls();

  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isDemo) return null;

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleTriggerAccident = (severity = 'high') => {
    triggerAccident({ severity });
    showFeedback(`Simulated ${severity.toUpperCase()} accident alert triggered!`);
  };

  return (
    <View style={styles.container} accessibilityLabel="Demo Controls Banner">
      {/* Top compact bar */}
      <View style={styles.bar}>
        <View style={styles.badgeRow}>
          <View style={styles.demoTag}>
            <Text style={styles.demoTagText}>DEMO MODE</Text>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            Scenario: <Text style={styles.scenarioName}>{scenario || 'normal'}</Text>
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => handleTriggerAccident('high')}
            style={styles.quickAlertBtn}
            accessibilityLabel="Quick Trigger Accident"
          >
            <Text style={styles.quickAlertText}>🚨 Trigger Accident</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={styles.toggleBtn}
            accessibilityLabel="Toggle Demo Controls"
          >
            <Text style={styles.toggleBtnText}>{expanded ? 'Hide ▲' : 'Controls ▼'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ephemeral Feedback Toast */}
      {feedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      {/* Expanded Control Tray */}
      {expanded ? (
        <View style={styles.tray}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSection}>
            <Text style={styles.sectionTitle}>Scenarios:</Text>
            {scenarios.map((sc) => {
              const active = sc === scenario;
              return (
                <TouchableOpacity
                  key={sc}
                  onPress={() => {
                    setScenario(sc);
                    showFeedback(`Scenario set to: ${sc}`);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{sc}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Granular Telemetry Controls */}
          <View style={styles.controlGrid}>
            {/* Battery Simulation */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>Battery:</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => {
                    setBattery(null);
                    showFeedback('Battery: Unsupported / null');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>None (null)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setBattery(15);
                    showFeedback('Battery: 15% (Low)');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>15% Low</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setBattery(85);
                    showFeedback('Battery: 85% (Good)');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>85% Good</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Connectivity Simulation */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>Connectivity:</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => {
                    setConnectivity(true);
                    showFeedback('Helmet: Connected');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>Connected</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setConnectivity(false);
                    showFeedback('Helmet: Disconnected');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>Offline</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* GPS Simulation */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>GPS Status:</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => {
                    setGps('available');
                    showFeedback('GPS: Fix Available');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>Available</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setGps('searching');
                    showFeedback('GPS: Searching');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>Searching</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setGps('stale');
                    showFeedback('GPS: Stale (>5m)');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>Stale</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setGps('unavailable');
                    showFeedback('GPS: Unavailable');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>No Fix</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sensors Simulation */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>Hardware Sensors:</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSensors({ mpuOk: true });
                    showFeedback('MPU6050: Sensor OK');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>MPU OK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSensors({ mpuOk: false });
                    showFeedback('MPU6050: Sensor Fault');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>MPU Fault</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSensors({ gsmRegistered: true });
                    showFeedback('GSM: Registered');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>GSM Reg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSensors({ gsmRegistered: false });
                    showFeedback('GSM: Unregistered');
                  }}
                  style={styles.miniBtn}
                >
                  <Text style={styles.miniBtnText}>GSM Unreg</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Actions: Severity Triggers & Reset */}
            <View style={styles.bottomRow}>
              <View style={styles.accidentBtnGroup}>
                <TouchableOpacity
                  onPress={() => handleTriggerAccident('medium')}
                  style={[styles.accidentBtn, { backgroundColor: colors.orange }]}
                >
                  <Text style={styles.accidentBtnText}>Medium Accident</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTriggerAccident('low')}
                  style={[styles.accidentBtn, { backgroundColor: colors.grey }]}
                >
                  <Text style={styles.accidentBtnText}>Low Accident</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  resetDemo();
                  showFeedback('Demo reset to initial defaults.');
                }}
                style={styles.resetBtn}
              >
                <Text style={styles.resetBtnText}>↺ Reset All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3DC',
    borderBottomWidth: 1,
    borderColor: '#FCD34D',
    zIndex: 9999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  demoTag: {
    backgroundColor: '#D97706',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  demoTagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  label: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500',
  },
  scenarioName: {
    color: colors.navy,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickAlertBtn: {
    backgroundColor: colors.red,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  quickAlertText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  toggleBtn: {
    backgroundColor: '#FDE68A',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  toggleBtnText: {
    color: '#78350F',
    fontWeight: '700',
    fontSize: 11,
  },
  feedbackBox: {
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  tray: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollSection: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    alignSelf: 'center',
    marginRight: spacing.sm,
  },
  chip: {
    backgroundColor: colors.greySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  chipTextActive: {
    color: colors.white,
  },
  controlGrid: {
    paddingTop: 4,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupLabel: {
    width: 110,
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  miniBtn: {
    backgroundColor: colors.greySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  accidentBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  accidentBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accidentBtnText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: colors.greySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resetBtnText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '700',
  },
});
