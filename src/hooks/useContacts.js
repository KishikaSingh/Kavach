// TEMP stub (Person 1) — Person 3 replaces with the real hook. Mock interactions update local state.
import { useCallback } from 'react';
import { createStore, useStore } from './tempStore';
import { mockContacts } from './tempMock';

const store = createStore(mockContacts);

export default function useContacts() {
  const contacts = useStore(store);

  const addContact = useCallback(async (c) => {
    store.set((list) => [...list, { ...c, id: `c${Date.now()}`, isPrimary: list.length === 0 }]);
  }, []);
  const updateContact = useCallback(async (id, patch) => {
    store.set((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const deleteContact = useCallback(async (id) => {
    store.set((list) => list.filter((c) => c.id !== id));
  }, []);
  const setPrimary = useCallback(async (id) => {
    store.set((list) => list.map((c) => ({ ...c, isPrimary: c.id === id })));
  }, []);

  return { contacts, loading: false, error: null, addContact, updateContact, deleteContact, setPrimary };
}
