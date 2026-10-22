import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAlerts } from '../hooks/useAlerts.js';
import { useDemoControls } from '../hooks/useDemoControls.js';
import { useDevice } from '../hooks/useDevice.js';
import { AccidentAlertCard } from '../components/AccidentAlertCard.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import { colors, space, type } from '../components/person2Theme.js';
import ScreenContainer from '../components/ScreenContainer.js';
import { PERSON2_ROUTES } from './person2Routes.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'resolved', label: 'Resolved' },
];

export function AlertsScreen({ navigation }) {
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

  if (loading && !alerts.length) return <LoadingState label="Loading alerts" />;
  if (error && !alerts.length) return <ErrorState error={error} onRetry={retry} />;

  return (
    <ScreenContainer style={styles.screen} scroll={false} contentContainerStyle={styles.containerPadding}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={type.title} accessibilityRole="header">
              Alerts
            </Text>
            {isDemo || dataSource === 'demo' ? (
              <StatusBanner tone="info">Demo — alerts here are simulated.</StatusBanner>
            ) : null}
            {backendReachable === false ? (
              <StatusBanner tone="danger">Backend unreachable. Alert list may be out of date.</StatusBanner>
            ) : null}
            {error ? <StatusBanner tone="danger">{error.message}</StatusBanner> : null}
            {activeAlerts.length ? (
              <StatusBanner tone="danger">
                {activeAlerts.length} active alert{activeAlerts.length === 1 ? '' : 's'}. Viewing does not resolve them.
              </StatusBanner>
            ) : null}
            <View style={styles.filters} accessibilityRole="tablist">
              {FILTERS.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: filter === f.id }}
                  accessibilityLabel={`Filter ${f.label}`}
                  style={[styles.chip, filter === f.id && styles.chipOn]}
                >
                  <Text style={[styles.chipText, filter === f.id && styles.chipTextOn]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={filter === 'all' ? 'No alerts yet' : 'Nothing in this filter'}
            body="When the helmet reports an accident, it will appear here."
          />
        }
        renderItem={({ item }) => <AccidentAlertCard alert={item} onPress={openDetails} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  containerPadding: { padding: 0 },
  content: { padding: space.md, paddingBottom: 40, flexGrow: 1 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: space.md, marginTop: space.sm },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextOn: { color: '#FFFFFF' },
});
export default AlertsScreen;
