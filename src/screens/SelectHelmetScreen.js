// Choose which helmet the app should show and monitor.
// Opened from Profile and Device Settings: navigation.navigate('SelectHelmet').
// Real helmet scanning is not built yet; in demo mode the list is demo data.
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../components/ScreenContainer';
import StatusBadge from '../components/StatusBadge';
import DemoBadge from '../components/DemoBadge';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Loader from '../components/Loader';

import useHelmets from '../hooks/useHelmets';
import useDevice from '../hooks/useDevice';

import {
  colors,
  getTone,
  radius,
  shadows,
  spacing,
  typography,
  MIN_TOUCH,
} from '../constants/theme';
import { timeAgo } from '../utils/formatTime';

export default function SelectHelmetScreen({ navigation }) {
  const { helmets, selectedId, selectHelmet, loading, error, refresh } =
    useHelmets();
  const { dataSource } = useDevice();
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      await refresh();
    } finally {
      setScanning(false);
    }
  }, [refresh]);

  const choose = async (helmet) => {
    if (helmet.deviceId === selectedId) {
      navigation.goBack();
      return;
    }
    await selectHelmet(helmet.deviceId);
    navigation.goBack();
  };

  const onPressHelmet = (helmet) => {
    if (helmet.helmetStatus === 'connected') {
      choose(helmet);
      return;
    }
    Alert.alert(
      'Helmet is offline',
      `${helmet.name} is not reporting right now. Select it anyway?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select anyway', onPress: () => choose(helmet) },
      ]
    );
  };

  if (loading && helmets.length === 0) {
    return (
      <ScreenContainer edges={['bottom']}>
        <Loader message="Looking for helmets..." />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorState message={String(error.message || error)} onRetry={scan} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['bottom']} onRefresh={scan} refreshing={scanning}>
      <Text style={styles.title}>Select helmet</Text>
      <Text style={styles.subtitle}>
        Choose the helmet this app should show and monitor.
      </Text>
      {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

      {helmets.length === 0 ? (
        <EmptyState
          icon="hardware-chip-outline"
          title="No helmets found"
          message="Switch on your helmet, keep it close, then scan again."
          actionLabel="Scan again"
          onAction={scan}
        />
      ) : (
        helmets.map((h) => {
          const selected = h.deviceId === selectedId;
          const online = h.helmetStatus === 'connected';
          const tone = getTone(online ? 'green' : 'grey');
          return (
            <Pressable
              key={h.deviceId}
              onPress={() => onPressHelmet(h)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${h.name}, ${online ? 'online' : 'offline'}`}
              style={[
                styles.card,
                shadows.card,
                selected && styles.cardSelected,
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                <Ionicons
                  name="hardware-chip-outline"
                  size={24}
                  color={tone.fg}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {h.name}
                </Text>
                <Text style={styles.meta}>{h.deviceId}</Text>
                <Text style={styles.meta}>
                  Last seen: {timeAgo(h.lastUpdated)}
                </Text>
                <View style={styles.badges}>
                  <StatusBadge
                    label={online ? 'Connected' : 'Offline'}
                    tone={online ? 'green' : 'grey'}
                  />
                </View>
              </View>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={colors.green}
                />
              ) : (
                <Ionicons
                  name="ellipse-outline"
                  size={28}
                  color={colors.border}
                />
              )}
            </Pressable>
          );
        })
      )}

      <AppButton
        title="Scan for helmets"
        icon="refresh"
        variant="secondary"
        onPress={scan}
        loading={scanning}
        style={styles.scan}
      />
      <AppButton
        title="Pair a new helmet - Coming soon"
        variant="ghost"
        disabled
        style={styles.pair}
      />

      {dataSource === 'demo' ? (
        <Text style={styles.note}>
          Scanning is simulated in demo mode. These helmets are demo data.
        </Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  demo: { marginTop: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.lg,
    marginTop: spacing.md,
    minHeight: MIN_TOUCH + 40,
  },
  cardSelected: { borderColor: colors.green },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1, paddingRight: spacing.sm },
  name: { fontSize: 16, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badges: { flexDirection: 'row', marginTop: spacing.sm },
  scan: { marginTop: spacing.xl },
  pair: { marginTop: spacing.sm },
  note: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});