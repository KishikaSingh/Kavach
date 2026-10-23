// Live mode without Firebase settings must say so clearly, never fall back to fake data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { watch } from './helpers/collect.js';

process.env.EXPO_PUBLIC_DATA_SOURCE = 'live';
delete process.env.EXPO_PUBLIC_SUPABASE_URL;
delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test('missing Supabase env vars -> LIVE_NOT_CONNECTED', async () => {
  const { subscribeDevice } = await import('../src/services/deviceService.js');
  const { addContact } = await import('../src/services/contactService.js');
  const device = watch(subscribeDevice);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(device.state.value, undefined, 'no fake data');
  assert.equal(device.state.error.code, 'LIVE_NOT_CONNECTED');
  await assert.rejects(addContact({ name: 'Asha', phone: '9876543210' }), { code: 'LIVE_NOT_CONNECTED' });
});
