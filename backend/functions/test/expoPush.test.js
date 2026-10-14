const test = require('node:test');
const assert = require('node:assert/strict');
const { chunk, isExpoPushToken, sendExpoPushMessages } = require('../expoPush');

test('accepts Expo push tokens and rejects unrelated strings', () => {
  assert.equal(isExpoPushToken('ExponentPushToken[abc_123-XYZ]'), true);
  assert.equal(isExpoPushToken('ExpoPushToken[abc_123-XYZ]'), true);
  assert.equal(isExpoPushToken('fcm-token'), false);
  assert.equal(isExpoPushToken(null), false);
});

test('splits push payloads into Expo-sized batches', () => {
  const messages = Array.from({ length: 201 }, (_, index) => ({ to: `token-${index}` }));
  assert.deepEqual(chunk(messages).map((batch) => batch.length), [100, 100, 1]);
});

test('sends batches and preserves ticket order', async () => {
  const requests = [];
  const messages = [{ to: 'ExponentPushToken[first]' }, { to: 'ExponentPushToken[second]' }];
  const tickets = await sendExpoPushMessages(
    messages,
    async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }, { status: 'ok', id: 'ticket-2' }] }),
      };
    },
    async () => {}
  );

  assert.deepEqual(requests, [messages]);
  assert.deepEqual(tickets.map((ticket) => ticket.id), ['ticket-1', 'ticket-2']);
});

test('retries throttled requests and fails explicitly on permanent errors', async () => {
  let attempts = 0;
  const tickets = await sendExpoPushMessages(
    [{ to: 'ExponentPushToken[retry]' }],
    async () => {
      attempts += 1;
      if (attempts === 1) return { ok: false, status: 429, text: async () => 'rate limited' };
      return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-retried' }] }) };
    },
    async () => {}
  );
  assert.equal(attempts, 2);
  assert.equal(tickets[0].id, 'ticket-retried');

  await assert.rejects(
    sendExpoPushMessages(
      [{ to: 'ExponentPushToken[bad]' }],
      async () => ({ ok: false, status: 400, text: async () => 'invalid payload' }),
      async () => {}
    ),
    /Expo push request failed \(400\)/
  );
});

test('retries transient network failures', async () => {
  let attempts = 0;
  const tickets = await sendExpoPushMessages(
    [{ to: 'ExponentPushToken[network]' }],
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('connection reset');
      return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-network' }] }) };
    },
    async () => {}
  );

  assert.equal(attempts, 2);
  assert.equal(tickets[0].id, 'ticket-network');
});
