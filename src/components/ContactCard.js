import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from './person2Theme.js';

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

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => onPress?.(contact)}
        accessibilityRole="button"
        accessibilityLabel={`${contact.name}, ${contact.phone}${primary ? ', primary contact' : ''}`}
        accessibilityHint="Opens the edit contact form"
      >
        <View style={styles.header}>
          <Text style={type.subtitle}>{contact.name}</Text>
          {primary ? (
            <View style={styles.badge} accessibilityLabel="Primary emergency contact">
              <Text style={styles.badgeText}>PRIMARY</Text>
            </View>
          ) : null}
        </View>
        <Text style={type.muted}>{contact.phone}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Action label="Call" onPress={() => onCall?.(contact)} disabled={busy} />
        {!primary ? (
          <Action label="Set primary" onPress={() => onSetPrimary?.(contact)} disabled={busy} />
        ) : null}
        <Action label="Delete" danger onPress={() => onDelete?.(contact)} disabled={busy} />
      </View>
    </View>
  );
}

function Action({ label, onPress, disabled, danger }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.action, danger && styles.danger, disabled && styles.disabled]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.sm },
  action: {
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
  },
  danger: { backgroundColor: '#3B1518' },
  disabled: { opacity: 0.5 },
  actionText: { color: colors.text, fontWeight: '600' },
});
