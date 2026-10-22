import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useContacts } from '../hooks/useContacts.js';
import { ContactCard } from '../components/ContactCard.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import ScreenContainer from '../components/ScreenContainer.js';
import { colors, space, type } from '../components/person2Theme.js';
import { PERSON2_ROUTES } from './person2Routes.js';

export function ContactsScreen({ navigation }) {
  const {
    contacts,
    isConfigured,
    primaryContact,
    loading,
    error,
    retry,
    deleteContact,
    setPrimary,
  } = useContacts();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const callContact = async (contact) => {
    const url = `tel:${contact.phone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      setActionError('Calling is not available on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  const confirmDelete = (contact) => {
    Alert.alert(
      'Delete contact?',
      contact.isPrimary
        ? `${contact.name} is the primary emergency contact. Deleting them does not change the number stored on the helmet.`
        : `Delete ${contact.name}? This does not change the number stored on the helmet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(contact.id);
            setActionError(null);
            try {
              await deleteContact(contact.id);
            } catch (e) {
              setActionError(e?.message || 'Could not delete this contact.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const makePrimary = async (contact) => {
    setBusyId(contact.id);
    setActionError(null);
    try {
      await setPrimary(contact.id);
    } catch (e) {
      setActionError(e?.message || 'Could not set primary contact.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !contacts.length) return <LoadingState label="Loading contacts" />;
  if (error && !contacts.length) return <ErrorState error={error} onRetry={retry} />;

  return (
    <ScreenContainer edges={['top']} scroll={false} contentContainerStyle={styles.containerPadding}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={type.title} accessibilityRole="header">
              Emergency contacts
            </Text>
            <StatusBanner tone="info">
              App contacts are for calling from the phone. They are not automatically written to the helmet SMS
              recipient. Helmet SMS sync is coming soon.
            </StatusBanner>
            {!isConfigured ? (
              <StatusBanner tone="warning">No contacts yet. Add at least one emergency contact.</StatusBanner>
            ) : primaryContact ? (
              <Text style={type.muted}>Primary: {primaryContact.name}</Text>
            ) : null}
            {actionError ? <StatusBanner tone="danger">{actionError}</StatusBanner> : null}
            {error ? <StatusBanner tone="danger">{error.message}</StatusBanner> : null}
            <Pressable
              onPress={() => navigation?.navigate(PERSON2_ROUTES.ContactForm, {})}
              accessibilityRole="button"
              accessibilityLabel="Add emergency contact"
              style={styles.add}
            >
              <Text style={styles.addText}>Add contact</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No emergency contacts"
            body="Add someone the rider trusts. Saving here does not update the helmet SMS number."
            actionLabel="Add contact"
            onAction={() => navigation?.navigate(PERSON2_ROUTES.ContactForm, {})}
          />
        }
        renderItem={({ item }) => (
          <ContactCard
            contact={item}
            busy={busyId === item.id}
            onPress={(c) => navigation?.navigate(PERSON2_ROUTES.ContactForm, { contactId: c.id })}
            onCall={callContact}
            onSetPrimary={makePrimary}
            onDelete={confirmDelete}
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  containerPadding: { padding: 0 },
  content: { padding: space.md, paddingBottom: 40, flexGrow: 1 },
  add: {
    marginVertical: space.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  addText: { color: '#FFFFFF', fontWeight: '700' },
});
export default ContactsScreen;
