import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { useContacts } from '../hooks/useContacts.js';
import { EmptyState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import { colors, space, type } from '../components/person2Theme.js';
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
    // The contact arrives asynchronously; copy it once when edit mode loads.
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

  if (contactId && loading && !existing) return <LoadingState label="Loading contact" />;
  if (contactId && !loading && !existing) {
    return (
      <EmptyState
        title="Contact not found"
        body="It may have been deleted."
        actionLabel="Back to contacts"
        onAction={() => navigation?.goBack?.()}
      />
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={type.title} accessibilityRole="header">
          {existing ? 'Edit contact' : 'Add contact'}
        </Text>
        <StatusBanner tone="info">
          Saving here does not update the helmet’s SMS recipient. Helmet SMS sync is coming soon.
        </StatusBanner>
        {formError ? (
          <StatusBanner tone="danger" accessibilityLabel={formError}>
            {formError}
          </StatusBanner>
        ) : null}

        <Text style={type.label} nativeID="nameLabel">
          NAME
        </Text>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError('');
          }}
          placeholder="Full name"
          placeholderTextColor={colors.muted}
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

        <Text style={type.label} nativeID="phoneLabel">
          PHONE
        </Text>
        <TextInput
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setPhoneError('');
          }}
          placeholder="+91 98765 43210"
          placeholderTextColor={colors.muted}
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

        <Pressable
          onPress={onSave}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          accessibilityLabel={existing ? 'Save contact' : 'Add contact'}
          style={[styles.save, busy && styles.disabled]}
        >
          <Text style={styles.saveText}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Add contact'}</Text>
        </Pressable>

        {existing ? (
          <Pressable
            onPress={onDelete}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Delete contact"
            style={styles.delete}
          >
            <Text style={styles.deleteText}>Delete contact</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: 40, gap: space.sm },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13 },
  save: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.text, fontWeight: '700' },
  delete: { marginTop: space.sm, alignItems: 'center', paddingVertical: space.sm },
  deleteText: { color: colors.danger, fontWeight: '700' },
});
export default ContactFormScreen;
