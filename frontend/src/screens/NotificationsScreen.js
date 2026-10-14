// Opened from the Dashboard bell. Tapping an item marks it read; accident items also open Alert Details.
// A notification may carry an optional `alertId` (assumption: not in the contract yet, ask Person 2/3 to include it).
import React from 'react';
import { View, Alert, StyleSheet } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import NotificationItem from '../components/NotificationItem';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';
import DemoBadge from '../components/DemoBadge';

import useNotifications from '../hooks/useNotifications';
import useDevice from '../hooks/useDevice';
import { spacing } from '../constants/theme';

export default function NotificationsScreen({ navigation }) {
  const { notifications, unreadCount, loading, error, markRead, markAllRead, clearAll } = useNotifications();
  const { dataSource } = useDevice();
  const demo = dataSource === 'demo';

  const onItemPress = async (n) => {
    if (!n.read) await markRead(n.id);
    if (n.type === 'accident' && n.alertId) navigation.navigate('AlertDetails', { alertId: n.alertId });
  };

  const confirmClear = () =>
    Alert.alert('Clear history', 'Delete all notifications? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearAll() },
    ]);

  if (loading && notifications.length === 0) {
    return (
      <ScreenContainer edges={['bottom']}>
        <Loader />
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorState message={String(error.message || error)} />
      </ScreenContainer>
    );
  }

  const sorted = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <ScreenContainer edges={['bottom']}>
      {demo ? <DemoBadge style={styles.demo} /> : null}
      {sorted.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="No notifications" message="Accident, helmet and GPS notices will appear here." />
      ) : (
        <>
          <View style={styles.actions}>
            <AppButton title="Mark all as read" variant="secondary" icon="checkmark-done" onPress={markAllRead} disabled={unreadCount === 0} style={styles.flex} />
            <View style={styles.gap} />
            <AppButton title="Clear history" variant="secondary" icon="trash-outline" onPress={confirmClear} style={styles.flex} />
          </View>
          {sorted.map((n) => (
            <NotificationItem key={n.id} item={n} demo={demo} onPress={() => onItemPress(n)} />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { width: spacing.sm },
  demo: { marginBottom: spacing.md },
  actions: { flexDirection: 'row', marginBottom: spacing.md },
});
