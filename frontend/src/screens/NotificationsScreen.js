// Opened from the Dashboard bell. Tapping an item marks it read; accident items also open Alert Details.
import React from 'react';
import { View, Alert, StyleSheet } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import NotificationItem from '../components/NotificationItem';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';
import DemoModeBanner from '../components/DemoModeBanner';

import useNotifications from '../hooks/useNotifications';
import useDevice from '../hooks/useDevice';
import { colors, spacing } from '../constants/theme';

export default function NotificationsScreen({ navigation }) {
  const { notifications, unreadCount, loading, error, markRead, markAllRead, clearAll } = useNotifications();
  const { dataSource } = useDevice();
  const demo = dataSource === 'demo';

  const onItemPress = async (n) => {
    if (!n.read) await markRead(n.id);
    if (n.type === 'accident' && n.alertId) navigation.navigate('AlertDetails', { alertId: n.alertId });
  };

  const confirmClear = () =>
    Alert.alert('Clear history', 'Delete all notification entries? This cannot be undone.', [
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
    <View style={styles.container}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'System notices'}
        onBack={() => navigation.goBack()}
      />

      <ScreenContainer edges={['bottom']}>
        {demo ? <DemoModeBanner label="DEMO MODE — Simulated notifications" style={styles.demo} /> : null}

        {sorted.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications yet"
            message="Accident alerts, helmet connectivity status, and telemetry updates will appear here."
          />
        ) : (
          <>
            <View style={styles.actions}>
              <AppButton
                title="Mark all as read"
                variant="secondary"
                size="sm"
                icon="checkmark-done"
                onPress={markAllRead}
                disabled={unreadCount === 0}
                style={styles.flex}
              />
              <View style={styles.gap} />
              <AppButton
                title="Clear history"
                variant="secondary"
                size="sm"
                icon="trash-outline"
                onPress={confirmClear}
                style={styles.flex}
              />
            </View>
            {sorted.map((n) => (
              <NotificationItem key={n.id} item={n} demo={demo} onPress={() => onItemPress(n)} />
            ))}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  gap: {
    width: spacing.sm,
  },
  demo: {
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
});
