// Safe-area wrapper with optional scrolling and pull-to-refresh.
// Tab screens use the default edges (top only; the tab bar handles the bottom).
// Dynamic Theme-aware background.
import React from 'react';
import { ScrollView, RefreshControl, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider.js';
import { spacing } from '../constants/theme';

export default function ScreenContainer({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  edges = ['top'],
  contentContainerStyle,
  style,
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
