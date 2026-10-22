import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '../theme/index.js';

export function ContactCard({
  contact,
  onPress,
  onCall,
  onSetPrimary,
  onDelete,
  busy = false,
}) {
  if (!contact) return null;
  const primary = !!contact.isPrimary;
  const initial = contact.name ? contact.name.charAt(0).toUpperCase() : 'C';

  return (
    <View style={[styles.card, shadows.sm, primary && styles.primaryBorder]}>
      <Pressable
        onPress={() => onPress?.(contact)}
        accessibilityRole="button"
        accessibilityLabel={`${contact.name}, ${contact.phone}${primary ? ', primary contact' : ''}`}
        accessibilityHint="Opens the edit contact form"
        style={styles.cardHeader}
      >
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{contact.name}</Text>
              {primary ? (
                <View style={styles.badge} accessibilityLabel="Primary emergency contact">
                  <Text style={styles.badgeText}>PRIMARY</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.phone}>{contact.phone}</Text>
          </View>
          <Ionicons name="create-outline" size={20} color={colors.textMuted} />
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Action
          label="Call"
          icon="call"
          variant="call"
          onPress={() => onCall?.(contact)}
          disabled={busy}
        />
        {!primary ? (
          <Action
            label="Set Primary"
            icon="star-outline"
            variant="default"
            onPress={() => onSetPrimary?.(contact)}
            disabled={busy}
          />
        ) : null}
        <Action
          label="Delete"
          icon="trash-outline"
          variant="danger"
          onPress={() => onDelete?.(contact)}
          disabled={busy}
        />
      </View>
    </View>
  );
}

function Action({ label, icon, variant = 'default', onPress, disabled }) {
  const isCall = variant === 'call';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.action,
        isCall && styles.actionCall,
        isDanger && styles.actionDanger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={isCall ? colors.success : isDanger ? colors.emergency : colors.midnightNavy}
          style={styles.actionIcon}
        />
      ) : null}
      <Text
        style={[
          styles.actionText,
          isCall && styles.actionTextCall,
          isDanger && styles.actionTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  primaryBorder: {
    borderColor: 'rgba(0, 184, 169, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: colors.safetyTeal,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.safetyTeal,
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
    color: colors.midnightNavy,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: colors.safetyTeal,
    fontSize: 10,
    fontWeight: '800',
  },
  phone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  actionCall: {
    backgroundColor: '#E8F5E9',
  },
  actionDanger: {
    backgroundColor: '#FEE2E2',
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
    color: colors.midnightNavy,
    fontWeight: '700',
    fontSize: 12,
  },
  actionTextCall: {
    color: colors.success,
  },
  actionTextDanger: {
    color: colors.emergency,
  },
});

export default ContactCard;
