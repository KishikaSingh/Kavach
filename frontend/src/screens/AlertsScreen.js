import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlerts } from '../hooks/useAlerts.js';
import { useDemoControls } from '../hooks/useDemoControls.js';
import { useDevice } from '../hooks/useDevice.js';
import { AccidentAlertCard } from '../components/AccidentAlertCard.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import DemoModeBanner from '../components/DemoModeBanner.js';
import ScreenContainer from '../components/ScreenContainer.js';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, shadows, spacing, typography } from '../constants/theme';
import { PERSON2_ROUTES } from './person2Routes.js';

const FILTERS = [
  { id: 'all', label: 'All Alerts' },
  { id: 'new', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
];

export function AlertsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { alerts, activeAlerts, loading, error, refresh, refreshing, retry } = useAlerts();
  const { dataSource, backendReachable } = useDevice();
  const { isDemo } = useDemoControls();
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    if (filter === 'new') return alerts.filter((a) => a.status === 'new');
    if (filter === 'resolved') return alerts.filter((a) => a.status === 'resolved');
    return alerts;
  }, [alerts, filter]);

  const openDetails = useCallback(
    (alert) => {
      navigation?.navigate(PERSON2_ROUTES.AlertDetails, { alertId: alert.id });
    },
    [navigation]
  );

  if (loading && !alerts.length) return <LoadingState label="Loading alerts…" />;
  if (error && !alerts.length) return <ErrorState error={error} onRetry={retry} />;

  return (
    <ScreenContainer style={[styles.screen, { backgroundColor: colors.background }]} scroll={false} contentContainerStyle={styles.containerPadding}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.safetyTeal} />}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
                  Safety Alerts
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Incident history and emergency logs</Text>
              </View>
              {activeAlerts.length > 0 ? (
                <View style={[styles.activeBadge, { backgroundColor: colors.emergencySurface, borderColor: colors.emergencyBorder }]}>
                  <Text style={[styles.activeBadgeText, { color: colors.emergency }]}>{activeAlerts.length} ACTIVE</Text>
                </View>
              ) : null}
            </View>

            {isDemo || dataSource === 'demo' ? (
              <DemoModeBanner label="DEMO MODE — Simulated alert logs" style={styles.bannerMargin} />
            ) : null}

            {backendReachable === false ? (
              <StatusBanner tone="danger">Backend unreachable. Alert records may be outdated.</StatusBanner>
            ) : null}

            {error ? <StatusBanner tone="danger">{error.message}</StatusBanner> : null}

            {activeAlerts.length ? (
              <View style={[styles.activeAlertNotice, { backgroundColor: colors.emergencySurface, borderColor: colors.emergencyBorder }]}>
                <Ionicons name="alert-circle" size={18} color={colors.emergency} style={{ marginRight: 6 }} />
                <Text style={[styles.activeAlertNoticeText, { color: colors.emergency }]}>
                  {activeAlerts.length} active emergency alert{activeAlerts.length === 1 ? '' : 's'}. Viewing does not resolve them.
                </Text>
              </View>
            ) : null}

            <View style={styles.filters} accessibilityRole="tablist">
              {FILTERS.map((f) => {
                const isActive = filter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setFilter(f.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Filter ${f.label}`}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? colors.safetyTeal : (isDark ? colors.cardElevated : colors.card),
                        borderColor: isActive ? colors.safetyTeal : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? colors.white : colors.textSecondary },
                        isActive && styles.chipTextOn,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={filter === 'all' ? 'No alerts recorded' : 'No matching alerts'}
            body={
              filter === 'all'
                ? 'When the helmet registers an abnormal impact or emergency trigger, it will appear here.'
                : `There are currently no alerts matching the ${filter} filter.`
            }
          />
        }
        renderItem={({ item }) => <AccidentAlertCard alert={item} onPress={openDetails} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  containerPadding: {
    padding: 0,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
    flexGrow: 1,
  },
  headerArea: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  activeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bannerMargin: {
    marginVertical: spacing.sm,
  },
  activeAlertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginVertical: spacing.sm,
  },
  activeAlertNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...shadows.sm,
  },
  chipText: {
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextOn: {
    fontWeight: '800',
  },
});

export default AlertsScreen;
