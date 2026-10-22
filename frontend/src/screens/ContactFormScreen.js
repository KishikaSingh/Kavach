import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useContacts } from '../hooks/useContacts.js';
import { EmptyState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import ScreenHeader from '../components/ScreenHeader.js';
import AppCard from '../components/AppCard.js';
import AppButton from '../components/AppButton.js';
import { colors, radius, spacing } from '../constants/theme';
import { normalizePhone, validateName } from '../utils/validators.js';

export function ContactFormScreen({ route, navigation }) {
  const contactId = route?.params?.contactId;
  const { contacts, loading, addContact, updateContact, deleteContact } = useContacts();
  const existing = useMemo(
    () => (contactId ? contacts.find((c) => c.id === contactId) : null),
    [contacts, contactId]
  );

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!existing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(existing.name);
    setPhone(existing.phone);
  }, [existing]);

  const applyServiceError = (error) => {
    const code = error?.code;
    const message = error?.message || 'Could not save this contact.';
    if (code === 'INVALID_NAME') setNameError(message);
    else if (code === 'INVALID_PHONE' || code === 'DUPLICATE_PHONE') setPhoneError(message);
    else setFormError(message);
  };

  if (contactId && loading && !existing) return <LoadingState label="Loading contact…" />;
  if (contactId && !loading && !existing) {
    return (
      <View style={styles.fallbackScreen}>
        <EmptyState
          title="Contact not found"
          body="It may have been removed."
          actionLabel="Back to Contacts"
          onAction={() => navigation?.goBack?.()}
        />
      </View>
    );
  }

  const onSave = async () => {
    const nameResult = validateName(name);
    const phoneResult = normalizePhone(phone);
    setNameError(nameResult.ok ? '' : nameResult.error);
    setPhoneError(phoneResult.ok ? '' : phoneResult.error);
    setFormError('');
    if (!nameResult.ok || !phoneResult.ok) return;

    setBusy(true);
    try {
      if (existing) {
        await updateContact(existing.id, { name: nameResult.value, phone: phoneResult.value });
      } else {
        await addContact({ name: nameResult.value, phone: phoneResult.value });
      }
      navigation?.goBack?.();
    } catch (error) {
      applyServiceError(error);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert(
      'Delete contact?',
      existing.isPrimary
        ? 'This is the primary emergency contact. Deleting them does not change the helmet SMS recipient.'
        : 'This does not change the number stored on the helmet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setFormError('');
            try {
              await deleteContact(existing.id);
              navigation?.goBack?.();
            } catch (error) {
              applyServiceError(error);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={existing ? 'Edit Contact' : 'New Contact'}
        subtitle={existing ? 'Update responder details' : 'Add emergency responder'}
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <StatusBanner tone="info">
          Emergency contacts are saved to your Kavach profile for calling and automated notification dispatch.
        </StatusBanner>

        {formError ? (
          <StatusBanner tone="danger" accessibilityLabel={formError}>
            {formError}
          </StatusBanner>
        ) : null}

        <AppCard variant="default" style={styles.card}>
          <Text style={styles.fieldLabel} nativeID="nameLabel">
            FULL NAME
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setNameError('');
            }}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            accessibilityLabel="Contact name"
            accessibilityLabelledBy="nameLabel"
            style={[styles.input, nameError ? styles.inputError : null]}
          />
          {nameError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {nameError}
            </Text>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]} nativeID="phoneLabel">
            PHONE NUMBER
          </Text>
          <TextInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError('');
            }}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            accessibilityLabel="Contact phone number"
            accessibilityLabelledBy="phoneLabel"
            style={[styles.input, phoneError ? styles.inputError : null]}
          />
          {phoneError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {phoneError}
            </Text>
          ) : null}
        </AppCard>

        <AppButton
          title={busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Emergency Contact'}
          icon="save-outline"
          variant="primary"
          onPress={onSave}
          disabled={busy}
          loading={busy}
          style={styles.saveBtn}
        />

        {existing ? (
          <AppButton
            title="Delete Contact"
            icon="trash-outline"
            variant="danger"
            onPress={onDelete}
            disabled={busy}
            style={styles.deleteBtn}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fallbackScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  card: {
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.midnightNavy,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.emergency,
  },
  error: {
    color: colors.emergency,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  deleteBtn: {
    marginTop: spacing.md,
  },
});

export default ContactFormScreen;
