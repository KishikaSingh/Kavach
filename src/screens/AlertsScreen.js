
// Alerts tab: all accident alerts, newest first, with status filters.
// Reads alerts through useAlerts only. Tapping a card opens AlertDetails.
// Viewing an alert never marks it resolved.
// Only the button on the details screen does.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import DemoBadge from '../components/DemoBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';

import useAlerts from '../hooks/useAlerts';
import useDevice from '../hooks/useDevice';

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  MIN_TOUCH,
} from '../constants/theme';
import { formatDateTime, timeAgo } from '../utils/formatTime';
import {
  formatCoord,
  hasValidCoords,
  severityTone,
  smsLabel,
} from '../utils/deviceStatus';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'sent', label: 'Sent' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_TONE = { new: 'red', sent: 'orange', resolved: 'green' };

export default function AlertsScreen({ navigation }) {
  const { alerts, loading, error, refresh } = useAlerts();
  const { dataSource } = useDevice();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Newest first.
  const sorted = useMemo(
    () =>
      [...alerts].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ),
    [alerts]
  );

  const counts = useMemo(
    () => ({
      all: sorted.length,
      new: sorted.filter((a) => a.status === 'new').length,
      sent: sorted.filter((a) => a.status === 'sent').length,
      resolved: sorted.filter((a) => a.status === 'resolved').length,
    }),
    [sorted]
  );

  const visible =
    filter === 'all' ? sorted : sorted.filter((a) => a.status === filter);
  const openCount = counts.new + counts.sent;

  if (loading && alerts.length === 0) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState
          message={String(error.message || error)}
          onRetry={onRefresh}
        />
      </ScreenContainer>
    );
  }

  const openAlert = (id) =>
    navigation.navigate('AlertDetails', { alertId: id });

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={styles.title}>Alerts</Text>
      {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

      <View style={[styles.summary, shadows.card]}>
        <Ionicons
          name={openCount > 0 ? 'alert-circle' : 'shield-checkmark'}
          size={30}
          color={openCount > 0 ? colors.red : colors.green}
        />
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>
            {openCount > 0
              ? `${openCount} alert${openCount === 1 ? '' : 's'} not resolved`
              : 'No unresolved alerts'}
          </Text>
          <Text style={styles.meta}>
            {counts.all} total in history
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label} ({counts[f.key]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title={filter === 'all' ? 'No alerts yet' : 'Nothing here'}
          message={
            filter === 'all'
              ? 'Accident alerts from the helmet will appear here.'
              : 'No alerts match this filter.'
          }
        />
      ) : (
        visible.map((a) => {
          const sms = smsLabel(a.smsStatus);
          return (
            <Pressable
              key={a.id}
              onPress={() => openAlert(a.id)}
              accessibilityRole="button"
              style={[styles.card, shadows.card]}
            >
              <View style={styles.rowBetween}>
                <StatusBadge
                  label={`${a.severity} severity`}
                  tone={severityTone(a.severity)}
                />
                <StatusBadge
                  label={a.status}
                  tone={STATUS_TONE[a.status] || 'grey'}
                />
              </View>

              <Text style={styles.time}>{formatDateTime(a.timestamp)}</Text>
              <Text style={styles.meta}>{timeAgo(a.timestamp)}</Text>

              <View style={styles.locRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.muted}
                />
                <Text style={styles.loc}>
                  {hasValidCoords(a)
                    ? `${formatCoord(a.latitude)}, ${formatCoord(a.longitude)}`
                    : 'No valid GPS fix'}
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <StatusBadge label={sms.label} tone={sms.tone} />
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.grey}
                />
              </View>
            </Pressable>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title },
  demo: { marginTop: spacing.sm },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  summaryText: { flex: 1, marginLeft: spacing.md },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  chipTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginTop: spacing.md,
  },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  loc: { fontSize: 13, color: colors.muted, marginLeft: spacing.xs },
});