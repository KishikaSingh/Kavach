// Profile and app settings.
// No authentication exists yet, so there is no Logout and the user is a
// local profile.
import React from 'react';
import { View, Text, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import ScreenContainer from '../components/ScreenContainer';
import ProfileRow from '../components/ProfileRow';
import DemoBadge from '../components/DemoBadge';

import useDevice from '../hooks/useDevice';
import useHelmets from '../hooks/useHelmets';
import useSettings from '../hooks/useSettings';
import useContacts from '../hooks/useContacts';

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../constants/theme';

const PRIVACY_TEXT =
  "The app shows the helmet's GPS position, not your phone's. " +
  'Contacts saved in the app do not change who the helmet texts ' +
  'unless contact sync is built.';

const HELP_TEXT =
  'If the helmet shows as disconnected, check its power and GSM signal, ' +
  'then pull down to refresh.';

export default function ProfileScreen({ navigation }) {
  const { dataSource } = useDevice();
  const { selectedHelmet } = useHelmets();
  const { settings, updateSettings } = useSettings();
  const { contacts } = useContacts();
  const version = Constants.expoConfig?.version || 'Unknown';

  const info = (title, message) => () => Alert.alert(title, message);

  const helmetValue = selectedHelmet
    ? `${selectedHelmet.name} (${selectedHelmet.deviceId})`
    : 'No helmet selected';

  return (
    <ScreenContainer edges={['bottom']}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={colors.white} />
        </View>
        <Text style={styles.name}>Helmet owner</Text>
        <Text style={styles.sub}>Local profile - no account sign-in yet</Text>
        {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}
      </View>

      <Text style={styles.section}>Helmet</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="hardware-chip-outline"
          label="Active helmet"
          value={helmetValue}
        />
        <ProfileRow
          icon="swap-horizontal-outline"
          label="Select or switch helmet"
          onPress={() => navigation.navigate('SelectHelmet')}
        />
        <ProfileRow
          icon="add-circle-outline"
          label="Pair a new helmet"
          comingSoon
          last
        />
      </View>

      <Text style={styles.section}>Notifications</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="notifications-outline"
          label="Push notifications"
          right={
            <Switch
              value={!!settings.notifications.push}
              onValueChange={(v) =>
                updateSettings({ notifications: { push: v } })
              }
              trackColor={{ true: colors.primary }}
            />
          }
        />
        <ProfileRow
          icon="volume-high-outline"
          label="Alert sound"
          right={
            <Switch
              value={!!settings.notifications.sound}
              onValueChange={(v) =>
                updateSettings({ notifications: { sound: v } })
              }
              trackColor={{ true: colors.primary }}
            />
          }
          last
        />
      </View>

      <Text style={styles.section}>Emergency</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow
          icon="people-outline"
          label="Emergency contacts"
          value={
            contacts.length
              ? `${contacts.length} configured`
              : 'None configured'
          }
          onPress={() => navigation.navigate('Main', { screen: 'Contacts' })}
          last
        />
      </View>

      <Text style={styles.section}>App</Text>
      <View style={[styles.card, shadows.card]}>
        <ProfileRow icon="color-palette-outline" label="Theme" comingSoon />
        <ProfileRow
          icon="lock-closed-outline"
          label="Privacy"
          onPress={info('Privacy', PRIVACY_TEXT)}
        />
        <ProfileRow
          icon="help-circle-outline"
          label="Help and support"
          onPress={info('Help and support', HELP_TEXT)}
        />
        <ProfileRow
          icon="information-circle-outline"
          label="App version"
          value={version}
          last
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.heading, marginTop: spacing.md },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  demo: { marginTop: spacing.sm },
  section: {
    ...typography.heading,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});