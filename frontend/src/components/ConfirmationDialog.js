// Confirmation dialog modal for critical or destructive safety actions.
// Dynamic Theme-aware component.
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import AppButton from './AppButton.js';
import { useTheme } from '../theme/ThemeProvider.js';
import { shadows, spacing, typography } from '../theme/index.js';

export default function ConfirmationDialog({
  visible = false,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderColor: colors.border,
            },
            shadows.hero,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}

          <View style={styles.actionRow}>
            <AppButton
              title={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              style={styles.cancelBtn}
            />
            <AppButton
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.confirmBtn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    borderRadius: 22,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: {
    minWidth: 90,
  },
  confirmBtn: {
    minWidth: 110,
  },
});
