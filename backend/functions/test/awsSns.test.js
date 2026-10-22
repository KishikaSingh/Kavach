const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePhoneNumber,
  formatMapsUrl,
  formatEmergencyMessage,
  sendSmsViaSns,
  dispatchEmergencySms,
} = require('../awsSns');

test('normalizePhoneNumber formats 10-digit Indian numbers and preserves valid international numbers', () => {
  assert.equal(normalizePhoneNumber('9876543210'), '+919876543210');
  assert.equal(normalizePhoneNumber('+91 98765-43210'), '+919876543210');
  assert.equal(normalizePhoneNumber('+14155552671'), '+14155552671');
  assert.equal(normalizePhoneNumber(''), null);
  assert.equal(normalizePhoneNumber(null), null);
});

test('formatMapsUrl formats Google Maps query when GPS is valid and handles invalid gracefully', () => {
  const valid = { gpsValid: true, latitude: 28.6139, longitude: 77.209 };
  assert.equal(formatMapsUrl(valid), 'https://www.google.com/maps?q=28.61390,77.20900');

  const invalid = { gpsValid: false, latitude: null, longitude: null };
  assert.equal(formatMapsUrl(invalid), 'Location unavailable (No GPS fix)');
});

test('formatEmergencyMessage includes user name and location', () => {
  const alert = {
    gpsValid: true,
    latitude: 12.9716,
    longitude: 77.5946,
    timestamp: '2026-10-22T10:00:00Z',
    severity: 'high',
  };
  const msg = formatEmergencyMessage(alert, 'John Doe');
  assert.match(msg, /John Doe/);
  assert.match(msg, /google\.com\/maps\?q=12\.97160,77\.59460/);
  assert.match(msg, /\[HIGH\]/);
});

test('sendSmsViaSns returns unconfigured when SNS client is not provided', async () => {
  const res = await sendSmsViaSns(null, { phone: '+919876543210', message: 'Test alert' });
  assert.equal(res.status, 'unconfigured');
  assert.equal(res.phone, '+919876543210');
});

test('sendSmsViaSns publishes command successfully with mock client', async () => {
  const mockClient = {
    send: async (command) => {
      assert.equal(command.input.PhoneNumber, '+919876543210');
      assert.equal(command.input.MessageAttributes['AWS.SNS.SMS.SMSType'].StringValue, 'Transactional');
      return { MessageId: 'mock-sns-msg-123' };
    },
  };

  const res = await sendSmsViaSns(mockClient, { phone: '9876543210', message: 'Accident alert' });
  assert.equal(res.status, 'sent');
  assert.equal(res.messageId, 'mock-sns-msg-123');
});

test('dispatchEmergencySms iterates through contacts and returns aggregated status', async () => {
  const mockClient = {
    send: async () => ({ MessageId: 'msg-abc-999' }),
  };

  const contacts = [
    { name: 'Mom', phone: '+919876543210' },
    { name: 'Dad', phone: '+919812345678' },
  ];

  const alert = { gpsValid: false };
  const res = await dispatchEmergencySms(contacts, alert, 'Alice', { snsClient: mockClient });

  assert.equal(res.finalStatus, 'sent');
  assert.equal(res.anySent, true);
  assert.equal(res.results.length, 2);
  assert.equal(res.results[0].status, 'sent');
  assert.equal(res.results[1].status, 'sent');
});

test('dispatchEmergencySms returns no_contacts when contact list is empty', async () => {
  const res = await dispatchEmergencySms([], {}, 'Alice');
  assert.equal(res.finalStatus, 'no_contacts');
  assert.equal(res.results.length, 0);
});
