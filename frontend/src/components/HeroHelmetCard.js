import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppCard from './AppCard';
import ConnectionIndicator from './ConnectionIndicator';
import { radius, spacing } from '../constants/theme';

export default function HeroHelmetCard({
  device,
  connected,
  health,
  onManagePress,
  colors,
  isDark,
}) {
  return (
    <AppCard variant="hero" style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroIdentity}>
          <View
            style={[
              styles.heroHelmetCircle,
              {
                backgroundColor: colors.primarySoft,
                borderColor: isDark ? colors.border : '#B2EBF2',
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={22} color={colors.safetyTeal} />
          </View>
          <View>
            <Text style={[styles.heroDeviceName, { color: colors.text }]}>
              {device?.deviceName || 'Kavach Smart Helmet'}
            </Text>
            <Text style={[styles.heroSubId, { color: colors.safetyTeal }]}>
              {device?.deviceId || device?.id || 'HELMET_001'} · Smart Safety System
            </Text>
          </View>
        </View>
        <ConnectionIndicator
          connected={connected}
          label={connected ? 'Connected' : 'Disconnected'}
          style={styles.heroBadge}
        />
      </View>

      <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

      <View style={styles.heroMiddleRow}>
        <View style={styles.heroHealthBox}>
          <View style={styles.heroHealthHeader}>
            <Ionicons
              name={
                health.tone === 'red'
                  ? 'alert-circle'
                  : health.tone === 'orange'
                  ? 'warning'
                  : 'checkmark-circle'
              }
              size={18}
              color={
                health.tone === 'red'
                  ? colors.emergency
                  : health.tone === 'orange'
                  ? colors.warning
                  : colors.safetyTeal
              }
              style={styles.heroHealthIcon}
            />
            <Text style={[styles.heroHealthTitle, { color: colors.text }]}>{health.title}</Text>
          </View>
          <Text style={[styles.heroHealthSub, { color: colors.textSecondary }]}>{health.sub}</Text>
        </View>

        <Pressable
          style={[
            styles.heroSettingsBtn,
            {
              backgroundColor: colors.primarySoft,
              borderColor: isDark ? colors.border : '#B2EBF2',
            },
          ]}
          onPress={onManagePress}
          accessibilityRole="button"
          accessibilityLabel="Device Settings"
        >
          <Ionicons name="settings-outline" size={15} color={colors.safetyTeal} />
          <Text style={[styles.heroSettingsText, { color: colors.safetyTeal }]}>Manage</Text>
        </Pressable>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHelmetCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
  },
  heroDeviceName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroSubId: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  heroBadge: {
    alignSelf: 'center',
  },
  heroDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  heroMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHealthBox: {
    flex: 1,
    marginRight: spacing.md,
  },
  heroHealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHealthIcon: {
    marginRight: 6,
  },
  heroHealthTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroHealthSub: {
    fontSize: 12,
    marginTop: 2,
  },
  heroSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  heroSettingsText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
});
