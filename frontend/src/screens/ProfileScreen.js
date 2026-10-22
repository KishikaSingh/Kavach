// Profile and app settings: Kavach Smart Helmet User Profile & Configuration
import React, { useState } from 'react';
import { View, Text, Switch, Alert, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import ProfileRow from '../components/ProfileRow';
import DemoModeBanner from '../components/DemoModeBanner';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import ThemeSelector from '../components/ThemeSelector';

import useDevice from '../hooks/useDevice';
import useSettings from '../hooks/useSettings';
import useContacts from '../hooks/useContacts';
import { useDemoControls } from '../hooks/useDemoControls';
import { useTheme } from '../hooks/useTheme';

import { radius, shadows, spacing, typography } from '../constants/theme';

export default function ProfileScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { device, dataSource } = useDevice();
  const { settings, updateSettings } = useSettings();
  const { contacts } = useContacts();
  const { isDemo, scenario, scenarios, setScenario, triggerAccident, resetDemo } = useDemoControls();
  const [demoNotice, setDemoNotice] = useState(null);

  const version = Constants.expoConfig?.version || '1.0.0';

  const info = (title, message) => () => Alert.alert(title, message);

  // Safe notification values with documented defaults
  const pushEnabled = settings?.notifications?.push ?? true;
  const soundEnabled = settings?.notifications?.sound ?? true;

  const handleSimulateAccident = () => {
    if (!isDemo && dataSource !== 'demo') return;
    try {
      const alert = triggerAccident({ severity: 'high' });
      setDemoNotice(`Simulated impact triggered (Alert #${alert?.id?.slice(-4) || 'OK'}). No real SMS was dispatched.`);
      setTimeout(() => setDemoNotice(null), 5000);
    } catch (e) {
      Alert.alert('Simulation error', e.message);
    }
  };

  const handleResetDemo = () => {
    if (!isDemo && dataSource !== 'demo') return;
    resetDemo();
    setDemoNotice('Demo telemetry and scenarios reset to normal.');
    setTimeout(() => setDemoNotice(null), 4000);
  };

  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Rider Profile"
        subtitle="Kavach Account & Settings"
        onBack={() => navigation.goBack()}
      />
      <ScreenContainer edges={['bottom']}>
        {/* Rider Profile Card */}
      <AppCard variant="hero" style={styles.profileHero}>
        <View style={styles.profileHeroRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>Rider Profile</Text>
            <Text style={styles.sub}>Kavach Safety Account</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>
                {dataSource === 'demo' ? 'DEMO SIMULATOR' : 'LIVE TELEMETRY'}
              </Text>
            </View>
          </View>
        </View>
      </AppCard>

      {dataSource === 'demo' ? (
        <DemoModeBanner label="DEMO MODE — Hardware simulator active" style={styles.bannerMargin} />
      ) : null}

      {demoNotice ? (
        <View style={styles.demoNoticeBox}>
          <Ionicons name="information-circle" size={16} color={colors.safetyTeal} style={{ marginRight: 6 }} />
          <Text style={styles.demoNoticeText}>{demoNotice}</Text>
        </View>
      ) : null}

      {/* Helmet Hardware Section */}
      <Text style={styles.section}>Helmet Hardware</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="hardware-chip-outline"
          label="Registered Device"
          value={device?.deviceId || 'KAVACH-HLM-01'}
          onPress={() => navigation.navigate('Main', { screen: 'Settings' })}
        />
        <ProfileRow
          icon="settings-outline"
          label="Hardware Diagnostics"
          value="MPU6050, GSM, GPS health"
          onPress={() => navigation.navigate('Main', { screen: 'Settings' })}
        />
        <ProfileRow
          icon="add-circle-outline"
          label="Pair New Helmet"
          comingSoon
          last
        />
      </View>

      {/* Appearance & Theme Preferences */}
      <Text style={styles.section}>Appearance & Theme</Text>
      <View style={[styles.card, shadows.card, { paddingVertical: spacing.md }]}>
        <ThemeSelector />
      </View>

      {/* Notification Preferences */}
      <Text style={styles.section}>Notifications & Audio</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="notifications-outline"
          label="Push Notifications"
          value="Emergency alerts and sync notices"
          right={
            <Switch
              value={Boolean(pushEnabled)}
              onValueChange={(v) => updateSettings?.({ notifications: { push: v } })}
              trackColor={{ true: colors.safetyTeal, false: '#CBD5E1' }}
              thumbColor={colors.white}
            />
          }
        />
        <ProfileRow
          icon="volume-high-outline"
          label="Emergency Alert Siren"
          value="Audible tone during impact alert"
          right={
            <Switch
              value={Boolean(soundEnabled)}
              onValueChange={(v) => updateSettings?.({ notifications: { sound: v } })}
              trackColor={{ true: colors.safetyTeal, false: '#CBD5E1' }}
              thumbColor={colors.white}
            />
          }
          last
        />
      </View>

      {/* Emergency Management */}
      <Text style={styles.section}>Emergency Response</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="people-outline"
          label="Emergency Contacts"
          value={contacts.length ? `${contacts.length} configured responder${contacts.length === 1 ? '' : 's'}` : 'None configured'}
          onPress={() => navigation.navigate('Main', { screen: 'Contacts' })}
          last
        />
      </View>

      {/* Developer & Demo Mode Testing Controls */}
      {(dataSource === 'demo' || isDemo) ? (
        <>
          <Text style={styles.section}>Demo Testing Controls</Text>
          <View style={[styles.card, shadows.card, { paddingVertical: spacing.md }]}>
            <Text style={styles.demoHeading}>Active Telemetry Scenario: {scenario?.toUpperCase() || 'NORMAL'}</Text>
            <View style={styles.scenarioGrid}>
              {scenarios.slice(0, 4).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.scenarioBtn, scenario === s && styles.scenarioBtnActive]}
                  onPress={() => setScenario(s)}
                >
                  <Text style={[styles.scenarioBtnText, scenario === s && styles.scenarioBtnTextActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.demoActionRow}>
              <AppButton
                title="Trigger Simulated Impact"
                icon="alert-circle-outline"
                variant="danger"
                size="sm"
                onPress={handleSimulateAccident}
                style={styles.flex}
              />
              <View style={{ width: 8 }} />
              <AppButton
                title="Reset Demo Data"
                icon="refresh-outline"
                variant="secondary"
                size="sm"
                onPress={handleResetDemo}
                style={styles.flex}
              />
            </View>
          </View>
        </>
      ) : null}

      {/* Application & Support */}
      <Text style={styles.section}>Application & Support</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          value="On-device telemetry & security"
          onPress={info('Privacy', "Kavach displays real-time GPS telemetry from the smart helmet only. Location coordinates are shared exclusively with your designated emergency contacts upon impact detection.")}
        />
        <ProfileRow
          icon="help-circle-outline"
          label="Help & Technical Support"
          onPress={info('Help & Support', 'If your helmet indicates disconnected status, check helmet battery power and GSM cellular coverage, then pull down to refresh.')}
        />
        <ProfileRow
          icon="information-circle-outline"
          label="Application Version"
          value={`v${version} (Production Ready)`}
          last
        />
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScreenContainer>
    </View>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  profileHero: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 184, 169, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.safetyTeal,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  sub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 169, 0.15)',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safetyTeal,
    marginRight: 6,
  },
  statusPillText: {
    color: colors.cyanAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerMargin: {
    marginBottom: spacing.sm,
  },
  demoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#064E3B' : '#E6F8F6',
    borderWidth: 1,
    borderColor: isDark ? '#059669' : '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  demoNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.safetyTeal,
    flex: 1,
  },
  section: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  demoHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  scenarioBtn: {
    backgroundColor: isDark ? '#1E293B' : colors.mutedSurface,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scenarioBtnActive: {
    backgroundColor: colors.safetyTeal,
    borderColor: colors.safetyTeal,
  },
  scenarioBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  scenarioBtnTextActive: {
    color: '#FFFFFF',
  },
  demoActionRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
