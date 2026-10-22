import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEmergencyNotification } from '../hooks/useEmergencyNotification.js';
import { colors, space, type } from './person2Theme.js';

export function EmergencyDispatchBanner({ alert, onAddContacts, style }) {
  const { dispatchRecord, isSending, notify, retry } = useEmergencyNotification(alert?.id);
  const [actionError, setActionError] = useState(null);

  if (!alert) return null;

  const handleRetry = async () => {
    setActionError(null);
    try {
      await retry(alert);
    } catch (e) {
      setActionError(e?.message || 'Could not retry emergency notification.');
    }
  };

  const handleSendAnyway = async () => {
    setActionError(null);
    try {
      await notify(alert, { threshold: 0 });
    } catch (e) {
      setActionError(e?.message || 'Could not trigger emergency notification.');
    }
  };

  const handleOpenSms = async () => {
    if (!dispatchRecord?.fallbackUrl) return;
    try {
      const can = await Linking.canOpenURL(dispatchRecord.fallbackUrl);
      if (can) {
        await Linking.openURL(dispatchRecord.fallbackUrl);
      } else {
        setActionError('SMS is not available on this device.');
      }
    } catch (e) {
      setActionError(e?.message || 'Could not open SMS application.');
    }
  };

  const status = dispatchRecord?.status;
  const recipients = dispatchRecord?.recipients || [];
  const recipientNames = recipients.map((r) => r.name || r.phone).join(', ');

  let bannerBg = colors.cardAlt;
  let borderColor = colors.border;
  let statusBadgeColor = colors.muted;
  let statusText = 'Not triggered';

  if (isSending || status === 'sending') {
    bannerBg = '#EFF6FF';
    borderColor = colors.primary;
    statusBadgeColor = colors.primary;
    statusText = 'Alerting contacts…';
  } else if (status === 'sent') {
    bannerBg = '#E4F6EE';
    borderColor = colors.success;
    statusBadgeColor = colors.success;
    statusText = 'Contacts alerted';
  } else if (status === 'demo_sent') {
    bannerBg = '#EFF6FF';
    borderColor = colors.primary;
    statusBadgeColor = colors.primary;
    statusText = 'Demo: Contacts alerted (simulated)';
  } else if (status === 'unconfigured') {
    bannerBg = '#FEF3DC';
    borderColor = colors.warning;
    statusBadgeColor = colors.warning;
    statusText = 'SMS gateway unconfigured';
  } else if (status === 'failed') {
    bannerBg = '#FDECEC';
    borderColor = colors.danger;
    statusBadgeColor = colors.danger;
    statusText = 'Alert delivery failed';
  } else if (status === 'no_contacts') {
    bannerBg = '#FEF3DC';
    borderColor = colors.warning;
    statusBadgeColor = colors.warning;
    statusText = 'No emergency contacts';
  } else if (status === 'below_threshold') {
    bannerBg = colors.cardAlt;
    borderColor = colors.border;
    statusBadgeColor = colors.muted;
    statusText = 'Below emergency threshold';
  }

  return (
    <View style={[styles.card, { backgroundColor: bannerBg, borderColor }, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Emergency Contacts Dispatch</Text>
        <View style={[styles.badge, { backgroundColor: statusBadgeColor }]}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
      </View>

      {isSending ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[type.muted, styles.bodyText]}>
            Notifying registered emergency contacts with incident location…
          </Text>
        </View>
      ) : null}

      {status === 'sent' ? (
        <Text style={[type.muted, styles.bodyText]}>
          SMS alert sent to: <Text style={styles.highlight}>{recipientNames || 'All registered contacts'}</Text>.
        </Text>
      ) : null}

      {status === 'demo_sent' ? (
        <Text style={[type.muted, styles.bodyText]}>
          Simulated notification dispatched to <Text style={styles.highlight}>{recipientNames}</Text>.
        </Text>
      ) : null}

      {status === 'unconfigured' ? (
        <View style={styles.actionBlock}>
          <Text style={[type.muted, styles.bodyText]}>
            Live SMS gateway is unconfigured. Set <Text style={styles.code}>EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL</Text> in environment.
          </Text>
          <Pressable
            onPress={handleOpenSms}
            accessibilityRole="button"
            accessibilityLabel="Open SMS app manually"
            style={[styles.button, { backgroundColor: colors.warning }]}
          >
            <Text style={styles.buttonText}>Send SMS Manually</Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'failed' ? (
        <View style={styles.actionBlock}>
          <Text style={[type.muted, styles.bodyText]}>
            {dispatchRecord?.error || 'Network error prevented sending emergency alert.'}
          </Text>
          <Pressable
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry emergency notification"
            style={[styles.button, { backgroundColor: colors.danger }]}
          >
            <Text style={styles.buttonText}>Retry Alert</Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'no_contacts' ? (
        <View style={styles.actionBlock}>
          <Text style={[type.muted, styles.bodyText]}>
            No emergency contacts have been registered to receive accident alerts.
          </Text>
          {onAddContacts ? (
            <Pressable
              onPress={onAddContacts}
              accessibilityRole="button"
              accessibilityLabel="Add emergency contacts"
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.buttonText}>Add Contacts</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {status === 'below_threshold' ? (
        <View style={styles.actionBlock}>
          <Text style={[type.muted, styles.bodyText]}>
            Impact confidence ({((dispatchRecord?.confidence || 0) * 100).toFixed(0)}%) is below the configured threshold ({((dispatchRecord?.threshold || 0) * 100).toFixed(0)}%).
          </Text>
          <Pressable
            onPress={handleSendAnyway}
            accessibilityRole="button"
            accessibilityLabel="Send alert to contacts anyway"
            style={[styles.button, { backgroundColor: colors.card }]}
          >
            <Text style={styles.buttonText}>Alert Contacts Anyway</Text>
          </Pressable>
        </View>
      ) : null}

      {!status ? (
        <View style={styles.actionBlock}>
          <Text style={[type.muted, styles.bodyText]}>
            Trigger notification to registered emergency contacts with map location.
          </Text>
          <Pressable
            onPress={handleSendAnyway}
            accessibilityRole="button"
            accessibilityLabel="Notify emergency contacts"
            style={[styles.button, { backgroundColor: colors.danger }]}
          >
            <Text style={styles.buttonText}>Notify Emergency Contacts</Text>
          </Pressable>
        </View>
      ) : null}

      {actionError ? (
        <Text style={styles.errorText}>{actionError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    color: colors.text,
    fontWeight: '600',
  },
  code: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: 4,
  },
  actionBlock: {
    marginTop: 4,
    gap: space.xs,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
});

export default EmergencyDispatchBanner;
