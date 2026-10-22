// Kavach Reusable ScreenHeader Component
// Header with optional back button, title, subtitle, and right-hand action icon.
// Dynamic Theme-aware component.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider.js';
import { spacing, typography, MIN_TOUCH } from '../theme/index.js';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightLabel,
  dark,
  style,
}) {
  const { colors, isDark } = useTheme();
  const isDarkMode = dark !== undefined ? dark : isDark;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDarkMode ? colors.card : colors.card,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.text}
            />
          </Pressable>
        ) : null}
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightIcon && onRightPress ? (
        <Pressable
          onPress={onRightPress}
          style={styles.rightBtn}
          accessibilityRole="button"
          accessibilityLabel={rightLabel || 'Header action'}
          hitSlop={8}
        >
          <Ionicons
            name={rightIcon}
            size={22}
            color={colors.text}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.supporting,
    fontSize: 12,
    marginTop: 1,
  },
  rightBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
