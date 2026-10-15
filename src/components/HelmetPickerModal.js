// Popup sheet to switch between helmets. Used on the Home screen:
// tap the Helmet Status card -> this sheet opens.
// <HelmetPickerModal visible={open} onClose={() => setOpen(false)} />
// Real helmet scanning is not built yet; in demo mode the list is demo data.
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StatusBadge from './StatusBadge';
import AppButton from './AppButton';

import useHelmets from '../hooks/useHelmets';
import useDevice from '../hooks/useDevice';

import {
  colors,
  getTone,
  radius,
  spacing,
  typography,
  MIN_TOUCH,
} from '../constants/theme';
import { timeAgo } from '../utils/formatTime';

export default function HelmetPickerModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { helmets, selectedId, selectHelmet, refresh } = useHelmets();
  const { dataSource } = useDevice();
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      await refresh();
    } finally {
      setScanning(false);
    }
  };

  const choose = async (helmet) => {
    if (helmet.deviceId !== selectedId) {
      await selectHelmet(helmet.deviceId);
    }
    onClose();
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close helmet picker"
        />

        <View
          style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Switch helmet</Text>
              <Text style={styles.subtitle}>
                Choose the helmet this app should show.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.navy} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {helmets.length === 0 ? (
              <Text style={styles.empty}>
                No helmets found. Switch on your helmet and scan again.
              </Text>
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
                    style={[styles.row, selected && styles.rowSelected]}
                  >
                    <View
                      style={[styles.iconWrap, { backgroundColor: tone.bg }]}
                    >
                      <Ionicons
                        name="hardware-chip-outline"
                        size={22}
                        color={tone.fg}
                      />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <Text style={styles.meta}>
                        {h.deviceId} - seen {timeAgo(h.lastUpdated)}
                      </Text>
                      <View style={styles.badgeRow}>
                        <StatusBadge
                          label={online ? 'Connected' : 'Offline'}
                          tone={online ? 'green' : 'grey'}
                        />
                      </View>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={selected ? colors.green : colors.border}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <AppButton
            title="Scan for helmets"
            icon="refresh"
            variant="secondary"
            onPress={scan}
            loading={scanning}
            style={styles.scan}
          />

          {dataSource === 'demo' ? (
            <Text style={styles.note}>
              Demo mode: scanning is simulated and these helmets are demo data.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 27, 58, 0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  title: { ...typography.heading },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  closeBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 28,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  rowSelected: { borderColor: colors.green },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1, paddingRight: spacing.sm },
  name: { fontSize: 15, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: spacing.xs },
  empty: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  scan: { marginTop: spacing.sm },
  note: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});