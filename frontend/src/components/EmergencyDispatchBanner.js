import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEmergencyNotification } from '../hooks/useEmergencyNotification.js';
import { useTheme } from '../hooks/useTheme.js';
import { getTone } from '../theme/colors.js';
import { spacing } from '../constants/theme';

export function EmergencyDispatchBanner({ alert, onAddContacts, style }) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
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

  let bannerBg = colors.cardAlt || colors.card;
  let borderColor = colors.border;
  let statusBadgeColor = isDark ? '#334155' : colors.border;
  let statusBadgeText = colors.textSecondary;
  let statusText = 'Not triggered';

  if (isSending || status === 'sending') {
    const tone = getTone('blue', isDark);
    bannerBg = tone.bg;
    borderColor = tone.border || colors.primary;
    statusBadgeColor = colors.primary;
    statusBadgeText = '#FFFFFF';
    statusText = 'Alerting contacts…';
  } else if (status === 'sent') {
    const tone = getTone('green', isDark);
    bannerBg = tone.bg;
    borderColor = tone.border || colors.success;
    statusBadgeColor = colors.success;
    statusBadgeText = '#FFFFFF';
    statusText = 'Contacts alerted';
  } else if (status === 'demo_sent') {
    const tone = getTone('blue', isDark);
    bannerBg = tone.bg;
    borderColor = tone.border || colors.primary;
    statusBadgeColor = colors.primary;
    statusBadgeText = '#FFFFFF';
    statusText = 'Demo: Contacts alerted (simulated)';
  } else if (status === 'unconfigured') {
    const tone = getTone('yellow', isDark);
    bannerBg = tone.bg;
    borderColor = tone.border || colors.warning;
    statusBadgeColor = colors.warning;
    statusBadgeText = '#FFFFFF';
    statusText = 'SMS gateway unconfigured';
  } else if (status === 'failed') {
    const tone = getTone('red', isDark);
    bannerBg = tone.bg;
    borderColor = tone.border || colors.danger;
    statusBadgeColor = colors.danger;
    statusBadgeText = '#FFFFFF';
    statusText = 'Alert delivery failed';
  } else if (status === 'no_contacts') {
    const tone = getTone('yellow', isDark);
    bannerBg = tone.bg;
    borderColor = tone.border || colors.warning;
    statusBadgeColor = colors.warning;
    statusBadgeText = '#FFFFFF';
    statusText = 'No emergency contacts';
  } else if (status === 'below_threshold') {
    bannerBg = colors.cardAlt || colors.card;
    borderColor = colors.border;
    statusBadgeColor = isDark ? '#334155' : colors.border;
    statusBadgeText = colors.textSecondary;
    statusText = 'Below emergency threshold';
  }

  return (
    <View style={[styles.card, { backgroundColor: bannerBg, borderColor }, style]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Emergency Contacts Dispatch</Text>
        <View style={[styles.badge, { backgroundColor: statusBadgeColor }]}>
          <Text style={[styles.badgeText, { color: statusBadgeText }]}>{statusText}</Text>
        </View>
      </View>

      {isSending ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Notifying registered emergency contacts with incident location…
          </Text>
        </View>
      ) : null}

      {status === 'sent' ? (
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          SMS alert sent to: <Text style={[styles.highlight, { color: colors.text }]}>{recipientNames || 'All registered contacts'}</Text>.
        </Text>
      ) : null}

      {status === 'demo_sent' ? (
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          Simulated notification dispatched to <Text style={[styles.highlight, { color: colors.text }]}>{recipientNames}</Text>.
        </Text>
      ) : null}

      {status === 'unconfigured' ? (
        <View style={styles.actionBlock}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Live SMS gateway is unconfigured. Set <Text style={[styles.code, { color: colors.primary }]}>EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL</Text> in environment.
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
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
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
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
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
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Impact confidence ({((dispatchRecord?.confidence || 0) * 100).toFixed(0)}%) is below the configured threshold ({((dispatchRecord?.threshold || 0) * 100).toFixed(0)}%).
          </Text>
          <Pressable
            onPress={handleSendAnyway}
            accessibilityRole="button"
            accessibilityLabel="Send alert to contacts anyway"
            style={[styles.button, { backgroundColor: isDark ? '#1E293B' : colors.card, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Alert Contacts Anyway</Text>
          </Pressable>
        </View>
      ) : null}

      {!status ? (
        <View style={styles.actionBlock}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
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
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '600',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  actionBlock: {
    marginTop: 4,
    gap: spacing.xs,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
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
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
});

export default EmergencyDispatchBanner;
