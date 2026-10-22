import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from './person2Theme.js';

export function LoadingState({ label = 'Loading' }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[type.muted, styles.gap]}>{label}…</Text>
    </View>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <View style={styles.center} accessibilityRole="text" accessibilityLabel={`${title}. ${body || ''}`}>
      <Text style={type.subtitle}>{title}</Text>
      {body ? <Text style={[type.muted, styles.gap, styles.centerText]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  const message = error?.message || 'Something went wrong.';
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Text style={type.subtitle}>Could not load this screen</Text>
      <Text style={[type.muted, styles.gap, styles.centerText]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again" style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const BANNER_THEMES = {
  danger: { bg: '#FDECEC', border: '#FCA5A5', text: '#B91C1C' },
  warning: { bg: '#FEF3DC', border: '#FCD34D', text: '#B45309' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  success: { bg: '#E4F6EE', border: '#86EFAC', text: '#15803D' },
};

export function StatusBanner({ tone = 'warning', children, accessibilityLabel }) {
  const theme = BANNER_THEMES[tone] || BANNER_THEMES.warning;
  return (
    <View
      style={[styles.banner, { backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1 }]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
    >
      <Text style={[styles.bannerText, { color: theme.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, backgroundColor: colors.bg },
  centerText: { textAlign: 'center' },
  gap: { marginTop: space.sm },
  button: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 10,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  banner: { padding: space.sm, borderRadius: 10, marginBottom: space.sm },
  bannerText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
