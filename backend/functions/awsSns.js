const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) return cleaned;
  // If 10 digits without country code, default to +91 (India)
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
  return `+${cleaned}`;
}

function createSnsClient(overrides = {}) {
  if (
    process.env.MOCK_EMERGENCY_DISPATCH === 'true' ||
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    overrides.mock === true
  ) {
    return {
      send: async () => ({ MessageId: `mock-sms-${Date.now()}` }),
    };
  }

  const region = overrides.region || process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = overrides.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = overrides.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new SNSClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function formatMapsUrl(alert) {
  if (
    alert &&
    alert.gpsValid === true &&
    Number.isFinite(alert.latitude) &&
    Number.isFinite(alert.longitude)
  ) {
    return `https://www.google.com/maps?q=${alert.latitude.toFixed(5)},${alert.longitude.toFixed(5)}`;
  }
  return 'Location unavailable (No GPS fix)';
}

function formatEmergencyMessage(alert, userName = 'Kavach Rider') {
  const location = formatMapsUrl(alert);
  const time = alert?.timestamp
    ? new Date(alert.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();
  const severityStr = alert?.severity ? ` [${String(alert.severity).toUpperCase()}]` : '';

  return `EMERGENCY ALERT${severityStr}: An accident was detected for ${userName} at ${time}. Location: ${location}. - Kavach Safety`;
}

async function sendSmsViaSns(client, { phone, message }) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return { phone, status: 'invalid_number', error: 'Invalid phone number format' };
  }

  if (!client) {
    return {
      phone: normalized,
      status: 'unconfigured',
      error: 'AWS SNS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are not configured',
    };
  }

  try {
    const command = new PublishCommand({
      PhoneNumber: normalized,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    const response = await client.send(command);
    return {
      phone: normalized,
      status: 'sent',
      messageId: response.MessageId,
    };
  } catch (err) {
    return {
      phone: normalized,
      status: 'failed',
      error: err.message || String(err),
    };
  }
}

async function dispatchEmergencySms(contacts, alert, userName, options = {}) {
  const client = options.snsClient || createSnsClient(options.clientConfig);
  const message = options.message || formatEmergencyMessage(alert, userName);
  const results = [];

  const contactList = Array.isArray(contacts) ? contacts : Object.values(contacts || {});

  for (const contact of contactList) {
    const phone = typeof contact === 'string' ? contact : contact?.phone;
    if (!phone) continue;

    const res = await sendSmsViaSns(client, { phone, message });
    results.push(res);
  }

  const anySent = results.some((r) => r.status === 'sent');
  const allFailed = results.length > 0 && results.every((r) => r.status === 'failed');
  const allUnconfigured = results.length > 0 && results.every((r) => r.status === 'unconfigured');

  let finalStatus = 'no_contacts';
  if (results.length > 0) {
    if (anySent) finalStatus = 'sent';
    else if (allUnconfigured) finalStatus = 'unconfigured';
    else if (allFailed) finalStatus = 'failed';
    else finalStatus = 'failed';
  }

  return {
    results,
    message,
    anySent,
    finalStatus,
  };
}

module.exports = {
  normalizePhoneNumber,
  createSnsClient,
  formatMapsUrl,
  formatEmergencyMessage,
  sendSmsViaSns,
  dispatchEmergencySms,
};
