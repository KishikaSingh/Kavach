import React from 'react';
import { View, StyleSheet } from 'react-native';
import MetricCard from './MetricCard';
import { formatCoord } from '../utils/deviceStatus';
import { timeAgo } from '../utils/formatTime';
import { spacing } from '../constants/theme';

export default function DashboardMetricsGrid({
  device,
  connected,
  gps,
  validCoords,
  accident,
  onNavigate,
}) {
  return (
    <>
      <View style={styles.metricsGrid}>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="battery-charging-outline"
            label="Battery Level"
            value={device?.batteryLevel != null ? `${device.batteryLevel}%` : 'Unavailable'}
            sublabel={
              device?.batteryLevel != null
                ? device.batteryLevel < 20
                  ? 'Low Battery'
                  : 'Optimal Charge'
                : 'No telematics'
            }
            tone={
              device?.batteryLevel != null
                ? device.batteryLevel < 20
                  ? 'orange'
                  : 'teal'
                : 'grey'
            }
          />
        </View>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="navigate-outline"
            label="GPS Fix"
            value={gps.label}
            sublabel={
              validCoords
                ? `${formatCoord(device.latitude)}, ${formatCoord(device.longitude)}`
                : 'No valid signal'
            }
            tone={gps.tone}
            onPress={() => onNavigate('Location')}
          />
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="sync-outline"
            label="Last Sync"
            value={device?.lastUpdated ? timeAgo(device.lastUpdated) : 'Unavailable'}
            sublabel={connected ? 'Active heartbeat' : 'Device idle'}
            tone={connected ? 'teal' : 'orange'}
          />
        </View>
        <View style={styles.metricsCol}>
          <MetricCard
            icon="shield-checkmark-outline"
            label="Accident Sensor"
            value={accident.label}
            sublabel={connected ? 'Real-time protection' : 'Last known state'}
            tone={accident.tone}
            onPress={() => onNavigate('Alerts')}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.sm,
  },
  metricsCol: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
});
