// Confirmation dialog modal for critical or destructive safety actions.
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import AppButton from './AppButton.js';
import { colors, radius, shadows, spacing, typography } from '../theme/index.js';

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
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.dialog, shadows.hero]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

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
    backgroundColor: 'rgba(16, 27, 45, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
});
