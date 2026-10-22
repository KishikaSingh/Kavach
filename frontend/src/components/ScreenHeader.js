// Kavach Reusable ScreenHeader Component
// Header with optional back button, title, subtitle, and right-hand action icon.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, MIN_TOUCH } from '../theme/index.js';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightLabel,
  dark = false,
  style,
}) {
  return (
    <View style={[styles.header, dark && styles.headerDark, style]}>
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
              color={dark ? colors.white : colors.text}
            />
          </Pressable>
        ) : null}
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, dark && styles.titleDark]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, dark && styles.subtitleDark]}
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
            color={dark ? colors.cyanAccent : colors.primary}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  headerDark: {
    backgroundColor: colors.midnightNavy,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  titleDark: {
    color: colors.white,
  },
  subtitle: {
    ...typography.supporting,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleDark: {
    color: '#B8C4DE',
  },
  rightBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
