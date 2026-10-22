import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { radius, shadows, spacing } from '../theme/index.js';

export function ContactCard({
  contact,
  onPress,
  onCall,
  onSetPrimary,
  onDelete,
  busy = false,
}) {
  const { colors } = useTheme();

  if (!contact) return null;
  const primary = !!contact.isPrimary;
  const initial = contact.name ? contact.name.charAt(0).toUpperCase() : 'C';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: primary ? colors.safetyTeal : colors.border,
        },
        shadows.sm,
        primary && styles.primaryBorder,
      ]}
    >
      <Pressable
        onPress={() => onPress?.(contact)}
        accessibilityRole="button"
        accessibilityLabel={`${contact.name}, ${contact.phone}${primary ? ', primary contact' : ''}`}
        accessibilityHint="Opens the edit contact form"
        style={styles.cardHeader}
      >
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.avatarText, { color: colors.safetyTeal }]}>{initial}</Text>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{contact.name}</Text>
              {primary ? (
                <View
                  style={[styles.badge, { backgroundColor: colors.primarySoft }]}
                  accessibilityLabel="Primary emergency contact"
                >
                  <Text style={[styles.badgeText, { color: colors.safetyTeal }]}>PRIMARY</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.phone, { color: colors.textSecondary }]}>{contact.phone}</Text>
          </View>
          <Ionicons name="create-outline" size={20} color={colors.textMuted} />
        </View>
      </Pressable>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Action
          label="Call"
          icon="call"
          variant="call"
          onPress={() => onCall?.(contact)}
          disabled={busy}
          colors={colors}
        />
        {!primary ? (
          <Action
            label="Set Primary"
            icon="star-outline"
            variant="default"
            onPress={() => onSetPrimary?.(contact)}
            disabled={busy}
            colors={colors}
          />
        ) : null}
        <Action
          label="Delete"
          icon="trash-outline"
          variant="danger"
          onPress={() => onDelete?.(contact)}
          disabled={busy}
          colors={colors}
        />
      </View>
    </View>
  );
}

function Action({ label, icon, variant = 'default', onPress, disabled, colors }) {
  const isCall = variant === 'call';
  const isDanger = variant === 'danger';

  let bg = colors.mutedSurface;
  let fg = colors.text;

  if (isCall) {
    bg = colors.successSurface;
    fg = colors.success;
  } else if (isDanger) {
    bg = colors.emergencySurface;
    fg = colors.emergency;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: bg },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={fg}
          style={styles.actionIcon}
        />
      ) : null}
      <Text style={[styles.actionText, { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  primaryBorder: {
    borderLeftWidth: 4,
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  phone: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  actionIcon: {
    marginRight: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 12,
  },
});

export default ContactCard;
