import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import DemoBadge from '../components/DemoBadge';
import useContacts from '../hooks/useContacts';
import useDevice from '../hooks/useDevice';
import { validateContact } from '../utils/validators';

export default function ContactsScreen() {
  const {
    contacts = [],
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    setPrimary,
  } = useContacts();
  const { dataSource } = useDevice();
  const scrollRef = useRef(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [editingId, setEditingId] = useState(null);

  function resetForm() {
    setName('');
    setPhone('');
    setRelationship('');
    setEditingId(null);
  }

  async function handleSave() {
    // Shared rules: name 2-40 chars, phone 8-15 digits, no duplicate numbers.
    const input = { name: name, phone: phone };
    const result = validateContact(input, contacts, editingId);

    if (!result.valid) {
      const message = result.errors.name || result.errors.phone;
      Alert.alert('Check the details', message);
      return;
    }

    const contact = {
      ...result.cleaned,
      relationship: relationship.trim(),
    };

    try {
      if (editingId !== null) {
        await updateContact(editingId, contact);
        Alert.alert('Success', 'Contact updated successfully.');
      } else {
        await addContact(contact);
        Alert.alert('Success', 'Contact added successfully.');
      }

      resetForm();
    } catch (err) {
      Alert.alert('Error', 'Could not save the contact.');
    }
  }

  function handleEdit(contact) {
    setName(contact.name || '');
    setPhone(contact.phone || '');
    setRelationship(contact.relationship || '');
    setEditingId(contact.id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleDelete(contact) {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contact.id);

              if (editingId === contact.id) {
                resetForm();
              }
            } catch (err) {
              Alert.alert('Error', 'Could not delete the contact.');
            }
          },
        },
      ]
    );
  }

  async function handlePrimary(contact) {
    try {
      await setPrimary(contact.id);
    } catch (err) {
      Alert.alert('Error', 'Could not update the primary contact.');
    }
  }

  function renderContact({ item }) {
    return (
      <View style={styles.contactCard}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>
            {item.name} {item.isPrimary ? '\u2605' : ''}
          </Text>

          <Text style={styles.contactDetail}>{item.phone}</Text>

          {item.relationship ? (
            <Text style={styles.contactDetail}>
              {item.relationship}
            </Text>
          ) : null}

          {item.isPrimary ? (
            <Text style={styles.primaryLabel}>PRIMARY CONTACT</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {!item.isPrimary && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handlePrimary(item)}
            >
              <Text style={styles.primaryButtonText}>Set Primary</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && contacts.length === 0) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={String(error.message || error)} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollRef={scrollRef}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.heading}>Emergency Contacts</Text>

        <Text style={styles.subtitle}>
          Manage the people who matter most.
        </Text>

        {dataSource === 'demo' ? <DemoBadge style={styles.demo} /> : null}

        <Text style={styles.note}>
          Contacts saved here do not change who the helmet sends SMS alerts to.
        </Text>

        <View style={styles.form}>
          <Text style={styles.formHeading}>
            {editingId !== null ? 'Edit Contact' : 'Add New Contact'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full name *"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number *"
            placeholderTextColor="#888"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Relationship (e.g. Parent, Friend)"
            placeholderTextColor="#888"
            value={relationship}
            onChangeText={setRelationship}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>
              {editingId !== null ? 'Update Contact' : 'Add Contact'}
            </Text>
          </TouchableOpacity>

          {editingId !== null && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
            >
              <Text style={styles.cancelButtonText}>Cancel Editing</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.listHeading}>
          Saved Contacts ({contacts.length})
        </Text>

        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>
            No contacts yet. Add your first contact above.
          </Text>
        ) : (
          contacts.map((item) => (
            <View key={String(item.id)}>{renderContact({ item })}</View>
          ))
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  demo: {
    marginBottom: 10,
  },
  note: {
    fontSize: 12,
    color: '#687386',
    marginBottom: 14,
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#172033',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#687386',
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#F3F6FA',
    padding: 16,
    borderRadius: 14,
    marginBottom: 22,
  },
  formHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#172033',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DEE8',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#172033',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#1677FF',
    padding: 13,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    padding: 10,
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#555F70',
    fontWeight: '600',
  },
  listHeading: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#172033',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6EF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#172033',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 13,
    color: '#687386',
    marginTop: 2,
  },
  primaryLabel: {
    color: '#16804A',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 7,
  },
  primaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#E5F6EC',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  primaryButtonText: {
    color: '#16804A',
    fontSize: 11,
    fontWeight: '600',
  },
  editButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#E8F1FF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  deleteButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25334A',
  },
  emptyText: {
    color: '#687386',
    textAlign: 'center',
    paddingVertical: 20,
  },
});