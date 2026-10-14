// Shared input validation. Phone numbers are stored without spaces/dashes, e.g. "+919876543210".

export function normalizePhone(raw = '') {
  // Keep a leading + and digits only.
  const trimmed = String(raw).trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

// Accepts 8-15 digits with an optional leading + (E.164 length rules).
export function isValidPhone(raw) {
  return /^\+?\d{8,15}$/.test(normalizePhone(raw));
}

// Returns { valid, errors: { name?, phone? }, cleaned: { name, phone } }.
// `contacts` and `editingId` are used to block duplicate phone numbers.
export function validateContact({ name, phone }, contacts = [], editingId = null) {
  const errors = {};
  const cleanName = String(name || '').trim();
  const cleanPhone = normalizePhone(phone);

  if (cleanName.length < 2) errors.name = 'Enter a name (at least 2 characters).';
  else if (cleanName.length > 40) errors.name = 'Name is too long (40 characters max).';

  if (!isValidPhone(cleanPhone)) {
    errors.phone = 'Enter a valid phone number with country code, e.g. +919876543210.';
  } else if (contacts.some((c) => c.id !== editingId && normalizePhone(c.phone) === cleanPhone)) {
    errors.phone = 'This number is already saved as another contact.';
  }

  return { valid: Object.keys(errors).length === 0, errors, cleaned: { name: cleanName, phone: cleanPhone } };
}