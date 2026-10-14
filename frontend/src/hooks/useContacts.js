import { useMemo } from 'react';
import {
  addContact, deleteContact, setPrimary, subscribeContacts, updateContact,
} from '../services/contactService.js';
import { useSubscription } from './useSubscription.js';

// useContacts() -> { contacts, isConfigured, primaryContact, loading, error,
//                    addContact, updateContact, deleteContact, setPrimary }
// Actions return Promises and reject with a ServiceError whose .code is one of
// INVALID_NAME, INVALID_PHONE, DUPLICATE_PHONE, NOT_FOUND - use .message for inline errors.
// Reminder for the UI: saving a contact does not update the helmet's SMS recipient.
export function useContacts() {
  const { data, loading, error, retry } = useSubscription(subscribeContacts);
  const contacts = useMemo(() => data || [], [data]);
  const primaryContact = useMemo(() => contacts.find((c) => c.isPrimary) || null, [contacts]);

  return {
    contacts,
    isConfigured: contacts.length > 0,
    primaryContact,
    loading,
    error,
    retry,
    addContact,
    updateContact,
    deleteContact,
    setPrimary,
  };
}
export default useContacts;
