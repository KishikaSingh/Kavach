// TEMP stub (Person 1) - Person 3 replaces with the real hook (same return shape).
// Contacts are kept in a shared in-memory store and saved to AsyncStorage on this phone,
// so add / edit / delete / set-primary survive an app restart. Rule kept here: when there is
// at least one contact, exactly one is primary.
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore, useStore } from './tempStore';
import { mockContacts } from './tempMock';

const STORAGE_KEY = 'smartHelmet.contacts';
const store = createStore(mockContacts);

// Guarantees exactly one primary (the first one wins) and none when the list is empty.
function normalize(list) {
  let seen = false;
  const fixed = list.map((c) => {
    const primary = !!c.isPrimary && !seen;
    if (primary) seen = true;
    return { ...c, isPrimary: primary };
  });
  if (fixed.length > 0 && !seen) fixed[0] = { ...fixed[0], isPrimary: true };
  return fixed;
}

function commit(updater) {
  store.set((list) => normalize(updater(list)));
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store.get())).catch(() => {});
}

// Load any saved contacts once, when this module is first imported.
AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw) store.set(normalize(JSON.parse(raw)));
  })
  .catch(() => {});

export default function useContacts() {
  const contacts = useStore(store);

  // c = { name, phone, relationship?, isPrimary? }
  const addContact = useCallback(async (c) => {
    const id = `c${Date.now()}`;
    commit((list) => [
      ...(c.isPrimary ? list.map((x) => ({ ...x, isPrimary: false })) : list),
      { id, name: c.name, phone: c.phone, relationship: c.relationship || '', isPrimary: !!c.isPrimary },
    ]);
    return id;
  }, []);

  // patch = any of { name, phone, relationship, isPrimary }
  const updateContact = useCallback(async (id, patch) => {
    commit((list) =>
      list.map((c) => {
        if (c.id === id) return { ...c, ...patch };
        return patch.isPrimary ? { ...c, isPrimary: false } : c;
      })
    );
  }, []);

  // Deleting the primary promotes the next contact (see normalize).
  const deleteContact = useCallback(async (id) => {
    commit((list) => list.filter((c) => c.id !== id));
  }, []);

  const setPrimary = useCallback(async (id) => {
    commit((list) => list.map((c) => ({ ...c, isPrimary: c.id === id })));
  }, []);

  return { contacts, loading: false, error: null, addContact, updateContact, deleteContact, setPrimary };
}