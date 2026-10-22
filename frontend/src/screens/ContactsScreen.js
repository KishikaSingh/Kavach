import React, { useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { useContacts } from '../hooks/useContacts.js';
import { ContactCard } from '../components/ContactCard.js';
import { EmptyState, ErrorState, LoadingState, StatusBanner } from '../components/ScreenStates.js';
import ScreenContainer from '../components/ScreenContainer.js';
import AppButton from '../components/AppButton.js';
import ConfirmationDialog from '../components/ConfirmationDialog.js';
import { colors, radius, spacing, typography } from '../constants/theme';
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
  const [contactToDelete, setContactToDelete] = useState(null);

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
    setContactToDelete(contact);
  };

  const handleDeleteConfirmed = async () => {
    if (!contactToDelete) return;
    const target = contactToDelete;
    setContactToDelete(null);
    setBusyId(target.id);
    setActionError(null);
    try {
      await deleteContact(target.id);
    } catch (e) {
      setActionError(e?.message || 'Could not delete this contact.');
    } finally {
      setBusyId(null);
    }
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

  if (loading && !contacts.length) return <LoadingState label="Loading emergency contacts…" />;
  if (error && !contacts.length) return <ErrorState error={error} onRetry={retry} />;

  return (
    <ScreenContainer edges={['top']} scroll={false} contentContainerStyle={styles.containerPadding}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title} accessibilityRole="header">
                  Emergency Contacts
                </Text>
                <Text style={styles.subtitle}>Trusted responders notified during impact</Text>
              </View>
            </View>

            <StatusBanner tone="info">
              Contacts saved here are dialed from this device. Helmet hardware SMS recipient synchronization is coming in a future update.
            </StatusBanner>

            {!isConfigured ? (
              <StatusBanner tone="warning">No contacts configured. Add at least one primary emergency contact.</StatusBanner>
            ) : primaryContact ? (
              <View style={styles.primaryIndicator}>
                <Text style={styles.primaryIndicatorText}>
                  Primary Responder: <Text style={{ fontWeight: '800' }}>{primaryContact.name}</Text>
                </Text>
              </View>
            ) : null}

            {actionError ? <StatusBanner tone="danger">{actionError}</StatusBanner> : null}
            {error ? <StatusBanner tone="danger">{error.message}</StatusBanner> : null}

            <AppButton
              title="Add Emergency Contact"
              icon="person-add-outline"
              variant="primary"
              onPress={() => navigation?.navigate(PERSON2_ROUTES.ContactForm, {})}
              style={styles.addBtn}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No emergency contacts"
            body="Add someone the rider trusts. In case of an accident detection, their details will be immediately accessible."
            actionLabel="Add Contact"
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={Boolean(contactToDelete)}
        title="Delete Contact?"
        message={
          contactToDelete?.isPrimary
            ? `${contactToDelete?.name} is the primary emergency contact. Deleting them removes quick-dial access.`
            : `Are you sure you want to delete ${contactToDelete?.name}?`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setContactToDelete(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  containerPadding: {
    padding: 0,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.midnightNavy,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  primaryIndicator: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  primaryIndicatorText: {
    fontSize: 13,
    color: colors.safetyTeal,
    fontWeight: '600',
  },
  addBtn: {
    marginVertical: spacing.md,
  },
});

export default ContactsScreen;
