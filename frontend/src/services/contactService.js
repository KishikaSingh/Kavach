import { demoStore } from './demoStore.js';
import { ServiceError } from './serviceError.js';
import { subscribeSlice, runAction } from './serviceUtils.js';
import { liveBackend } from './liveAdapter.js';
import { normalizePhone, validateName } from '../utils/validators.js';

// Emergency contacts. Validation lives here so invalid or duplicate entries are
// rejected no matter which screen calls these functions.
// NOTE for the UI: saving a contact here does NOT change the helmet's SMS recipient.

// In live mode we remember the last list the backend sent, so duplicate checks work.
let knownLiveContacts = [];

export function subscribeContacts(onData, onError) {
  return subscribeSlice(
    'contacts',
    'subscribeContacts',
    (list) => {
      knownLiveContacts = list || [];
      onData(list);
    },
    onError
  );
}

function currentContacts() {
  return liveBackend() ? knownLiveContacts : demoStore.get('contacts');
}

function cleanContact(input, existing, excludeId) {
  const name = validateName(input?.name);
  if (!name.ok) throw new ServiceError('INVALID_NAME', name.error);
  const phone = normalizePhone(input?.phone);
  if (!phone.ok) throw new ServiceError('INVALID_PHONE', phone.error);
  if (existing.some((c) => c.phone === phone.value && c.id !== excludeId)) {
    throw new ServiceError('DUPLICATE_PHONE', 'A contact with this number already exists.');
  }
  return { name: name.value, phone: phone.value };
}

// All functions return a Promise and reject with a ServiceError (see its codes).
export async function addContact(input) {
  const clean = cleanContact(input, currentContacts());
  return runAction('addContact', [clean], () => {
    const contacts = demoStore.get('contacts');
    contacts.push({
      id: `c${Date.now()}`,
      ...clean,
      isPrimary: contacts.length === 0, // the first contact becomes primary
    });
    demoStore.set('contacts', contacts);
  });
}

export async function updateContact(id, input) {
  const existing = currentContacts();
  if (!existing.some((c) => c.id === id)) throw new ServiceError('NOT_FOUND', 'Contact not found.');
  const clean = cleanContact(input, existing, id);
  return runAction('updateContact', [id, clean], () => {
    const contacts = demoStore.get('contacts');
    const c = contacts.find((x) => x.id === id);
    if (!c) throw new ServiceError('NOT_FOUND', 'Contact not found.');
    c.name = clean.name;
    c.phone = clean.phone;
    demoStore.set('contacts', contacts);
  });
}

// The UI must confirm first, and warn extra when deleting the primary contact.
export async function deleteContact(id) {
  return runAction('deleteContact', [id], () => {
    const contacts = demoStore.get('contacts');
    if (!contacts.some((c) => c.id === id)) throw new ServiceError('NOT_FOUND', 'Contact not found.');
    demoStore.set('contacts', contacts.filter((c) => c.id !== id));
  });
}

// Only one contact can be primary at a time.
export async function setPrimary(id) {
  return runAction('setPrimary', [id], () => {
    const contacts = demoStore.get('contacts');
    if (!contacts.some((c) => c.id === id)) throw new ServiceError('NOT_FOUND', 'Contact not found.');
    demoStore.set('contacts', contacts.map((c) => ({ ...c, isPrimary: c.id === id })));
  });
}
