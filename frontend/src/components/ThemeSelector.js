// ThemeSelector: 3-way appearance switcher (Light, Dark, System Default)
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { spacing } from '../theme/index.js';

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sunny-outline', activeIcon: 'sunny' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline', activeIcon: 'moon' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline', activeIcon: 'phone-portrait' },
];

export default function ThemeSelector({ style }) {
  const { mode, setMode, colors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]} accessibilityRole="radiogroup" accessibilityLabel="Appearance selector">
      <View style={[styles.selectorRow, { backgroundColor: isDark ? colors.cardElevated : colors.mutedSurface, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = mode === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setMode(opt.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.label} appearance mode`}
              style={[
                styles.optionBtn,
                isSelected && [
                  styles.optionBtnSelected,
                  {
                    backgroundColor: isDark ? colors.deepNavy : colors.card,
                    borderColor: colors.safetyTeal,
                  },
                ],
              ]}
            >
              <Ionicons
                name={isSelected ? opt.activeIcon : opt.icon}
                size={18}
                color={isSelected ? colors.safetyTeal : colors.textSecondary}
                style={styles.icon}
              />
              <Text
                style={[
                  styles.label,
                  { color: isSelected ? (isDark ? colors.text : colors.midnightNavy) : colors.textSecondary },
                  isSelected && styles.labelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 44,
  },
  optionBtnSelected: {
    borderWidth: 1.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSelected: {
    fontWeight: '800',
  },
});
