// Validation helpers. Used by contactService (so bad data never gets saved)
// and by Person 2's forms (for inline errors).

// Normalise a phone number to E.164. A bare 10-digit Indian number gets +91.
// Returns { ok: true, value: '+919876543210' } or { ok: false, error: '...' }.
export function normalizePhone(input) {
  if (typeof input !== 'string') return { ok: false, error: 'Enter a phone number.' };
  const hasPlus = input.trim().startsWith('+');
  const digits = input.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Enter a phone number.' };

  let e164;
  if (hasPlus) {
    e164 = `+${digits}`;
  } else if (digits.length === 10) {
    e164 = `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    e164 = `+${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    e164 = `+91${digits.slice(1)}`;
  } else {
    return { ok: false, error: 'Use a 10-digit number or include the country code, e.g. +91 98765 43210.' };
  }

  // E.164: + followed by 8 to 15 digits, first digit not 0.
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { ok: false, error: 'That does not look like a valid phone number.' };
  }
  // Indian numbers must be +91 followed by 10 digits starting with 6-9.
  if (e164.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(e164)) {
    return { ok: false, error: 'Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.' };
  }
  return { ok: true, value: e164 };
}

export function validateName(input) {
  const name = typeof input === 'string' ? input.trim() : '';
  if (name.length < 2) return { ok: false, error: 'Enter a name (at least 2 characters).' };
  if (name.length > 60) return { ok: false, error: 'Name is too long (60 characters max).' };
  return { ok: true, value: name };
}
