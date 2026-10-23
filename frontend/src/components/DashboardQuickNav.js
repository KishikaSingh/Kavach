import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../constants/theme';

export default function DashboardQuickNav({ onNavigate, colors, isDark }) {
  return (
    <View style={styles.quickActionsRow}>
      <Pressable
        style={styles.quickActionItem}
        onPress={() => onNavigate('Location')}
        accessibilityRole="button"
        accessibilityLabel="Open Location"
      >
        <View
          style={[
            styles.quickActionIconWrap,
            {
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="navigate-outline" size={22} color={colors.safetyTeal} />
        </View>
        <Text style={[styles.quickActionLabel, { color: colors.text }]}>Location</Text>
      </Pressable>

      <Pressable
        style={styles.quickActionItem}
        onPress={() => onNavigate('Contacts')}
        accessibilityRole="button"
        accessibilityLabel="Open Emergency Contacts"
      >
        <View
          style={[
            styles.quickActionIconWrap,
            {
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="people-outline" size={22} color={colors.safetyTeal} />
        </View>
        <Text style={[styles.quickActionLabel, { color: colors.text }]}>Contacts</Text>
      </Pressable>

      <Pressable
        style={styles.quickActionItem}
        onPress={() => onNavigate('Alerts')}
        accessibilityRole="button"
        accessibilityLabel="Open Alerts"
      >
        <View
          style={[
            styles.quickActionIconWrap,
            {
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.emergency} />
        </View>
        <Text style={[styles.quickActionLabel, { color: colors.text }]}>Alerts</Text>
      </Pressable>

      <Pressable
        style={styles.quickActionItem}
        onPress={() => onNavigate('Settings')}
        accessibilityRole="button"
        accessibilityLabel="Open Device Settings"
      >
        <View
          style={[
            styles.quickActionIconWrap,
            {
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="hardware-chip-outline" size={22} color={colors.safetyTeal} />
        </View>
        <Text style={[styles.quickActionLabel, { color: colors.text }]}>Device</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickActionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
