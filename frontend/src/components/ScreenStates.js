import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.js';
import { space } from './person2Theme.js';

export function LoadingState({ label = 'Loading' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.mutedText, { color: colors.textSecondary }, styles.gap]}>{label}…</Text>
    </View>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityRole="text" accessibilityLabel={`${title}. ${body || ''}`}>
      <Text style={[styles.subtitleText, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.mutedText, { color: colors.textSecondary }, styles.gap, styles.centerText]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  const { colors } = useTheme();
  const message = error?.message || 'Something went wrong.';
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityLiveRegion="polite">
      <Text style={[styles.subtitleText, { color: colors.text }]}>Could not load this screen</Text>
      <Text style={[styles.mutedText, { color: colors.textSecondary }, styles.gap, styles.centerText]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again" style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonText, { color: colors.white }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusBanner({ tone = 'warning', children, accessibilityLabel, style }) {
  const { colors } = useTheme();

  let bg = colors.warningSurface;
  let border = colors.warningBorder;
  let text = colors.warning;

  if (tone === 'danger' || tone === 'error' || tone === 'emergency') {
    bg = colors.emergencySurface;
    border = colors.emergencyBorder;
    text = colors.emergency;
  } else if (tone === 'info' || tone === 'blue') {
    bg = colors.infoSurface;
    border = colors.infoBorder;
    text = colors.info;
  } else if (tone === 'success' || tone === 'green') {
    bg = colors.successSurface;
    border = colors.successBorder;
    text = colors.success;
  }

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: bg, borderColor: border, borderWidth: 1 },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
    >
      <Text style={[styles.bannerText, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  gap: {
    marginTop: space.sm,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  mutedText: {
    fontSize: 13,
  },
  button: {
    marginTop: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: '700',
  },
  banner: {
    padding: space.sm + 2,
    borderRadius: 10,
    marginBottom: space.sm,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
