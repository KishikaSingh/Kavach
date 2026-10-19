const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 3;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isExpoPushToken(token) {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token);
}

function chunk(values, size = MAX_BATCH_SIZE) {
  const batches = [];
  for (let offset = 0; offset < values.length; offset += size) {
    batches.push(values.slice(offset, offset + size));
  }
  return batches;
}

async function sendBatch(messages, request = fetch, wait = delay) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await request(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new Error(`Expo push request failed after ${MAX_ATTEMPTS} attempts: ${error.message || error}`);
      }
      await wait(1000 * 2 ** attempt);
      continue;
    }

    if (response.ok) {
      const result = await response.json();
      if (!Array.isArray(result.data) || result.data.length !== messages.length) {
        throw new Error('Expo push service returned an invalid ticket response.');
      }
      return result.data;
    }

    const details = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) {
      throw new Error(`Expo push request failed (${response.status}): ${details}`);
    }
    await wait(1000 * 2 ** attempt);
  }
  throw new Error('Expo push request exhausted its retries.');
}

async function sendExpoPushMessages(messages, request = fetch, wait = delay) {
  const tickets = [];
  for (const batch of chunk(messages)) {
    tickets.push(...(await sendBatch(batch, request, wait)));
  }
  return tickets;
}

module.exports = { chunk, isExpoPushToken, sendExpoPushMessages };
