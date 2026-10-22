const admin = require('firebase-admin');
const crypto = require('node:crypto');
const { onValueCreated } = require('firebase-functions/v2/database');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { isExpoPushToken, sendExpoPushMessages } = require('./expoPush');
const { dispatchEmergencySms } = require('./awsSns');

admin.initializeApp();

const RECEIPT_DELAY_MS = 15 * 60 * 1000;

function mapsHint(alert) {
  if (
    alert.gpsValid === true &&
    Number.isFinite(alert.latitude) &&
    Number.isFinite(alert.longitude)
  ) {
    return `Location: ${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`;
  }
  return 'GPS was not valid when this alert was recorded. Open the app for details.';
}

async function claimDispatch(deviceId, alertId) {
  const dispatchRef = admin.database().ref(`pushDispatches/${deviceId}/${alertId}`);
  const result = await dispatchRef.transaction((current) => {
    if (current?.status === 'sent') return;
    if (current?.status === 'sending' && Date.now() - current.startedAt < 5 * 60 * 1000) return;
    return { status: 'sending', startedAt: Date.now() };
  });
  return { dispatchRef, result };
}

async function publishAccidentAlert(alert, deviceId, alertId) {
  const ownersSnapshot = await admin.database().ref(`deviceOwners/${deviceId}`).once('value');
  const owners = Object.keys(ownersSnapshot.val() || {});
  if (!owners.length) {
    console.warn(`onAccidentAlertCreated: no owners configured for ${deviceId}`);
    return { notifications: 0, tickets: 0, smsStatus: 'no_owner' };
  }

  const now = new Date().toISOString();
  const title = 'Accident detected';
  const body = mapsHint(alert);
  const rootRef = admin.database().ref();
  const writes = {};
  const targets = [];
  let aggregateSmsStatus = 'no_contacts';

  for (const uid of owners) {
    const notificationId = crypto.createHash('sha256').update(`${deviceId}/${alertId}`).digest('hex');
    writes[`users/${uid}/notifications/${notificationId}`] = {
      type: 'accident',
      title,
      body,
      timestamp: now,
      read: false,
      alertId: String(alertId),
      deviceId,
    };

    // 1. Fetch user settings, push tokens, profile, and emergency contacts
    const [settingsSnapshot, tokensSnapshot, profileSnapshot, contactsSnapshot] = await Promise.all([
      admin.database().ref(`users/${uid}/settings`).once('value'),
      admin.database().ref(`users/${uid}/pushTokens`).once('value'),
      admin.database().ref(`users/${uid}/profile`).once('value'),
      admin.database().ref(`users/${uid}/contacts`).once('value'),
    ]);

    // 2. Dispatch emergency SMS via AWS SNS to registered contacts
    const userName = profileSnapshot.child('name').val() || 'Kavach Rider';
    const contacts = contactsSnapshot.val() || {};
    const smsResult = await dispatchEmergencySms(contacts, alert, userName);

    aggregateSmsStatus = smsResult.finalStatus;
    writes[`alerts/${deviceId}/${alertId}/smsStatus`] = smsResult.finalStatus;
    writes[`alerts/${deviceId}/${alertId}/smsDispatchedAt`] = Date.now();
    writes[`smsDispatches/${deviceId}/${alertId}`] = {
      status: smsResult.finalStatus,
      completedAt: Date.now(),
      recipients: smsResult.results,
      message: smsResult.message,
    };

    // 3. Collect push tokens if enabled
    if (settingsSnapshot.child('notifications/push').val() !== false) {
      const tokenRecords = tokensSnapshot.val() || {};
      for (const [tokenId, record] of Object.entries(tokenRecords)) {
        if (!record || !isExpoPushToken(record.token)) continue;
        targets.push({
          uid,
          tokenId,
          message: {
            to: record.token,
            title,
            body,
            data: { type: 'accident', alertId: String(alertId), deviceId },
            priority: 'high',
            channelId: 'default',
            ...(settingsSnapshot.child('notifications/sound').val() === false ? {} : { sound: 'default' }),
          },
        });
      }
    }
  }

  if (Object.keys(writes).length) await rootRef.update(writes);

  if (!targets.length) {
    console.info(`onAccidentAlertCreated ${alertId}: no opted-in Expo push tokens`);
    return { notifications: owners.length, tickets: 0, smsStatus: aggregateSmsStatus };
  }

  const tickets = await sendExpoPushMessages(targets.map((target) => target.message));
  const receiptWrites = {};
  let accepted = 0;
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const target = targets[index];
    if (ticket.status === 'ok' && ticket.id) {
      receiptWrites[`pushReceipts/${target.uid}/${ticket.id}`] = {
        tokenId: target.tokenId,
        createdAt: Date.now(),
      };
      accepted += 1;
    } else if (ticket.details?.error === 'DeviceNotRegistered') {
      receiptWrites[`users/${target.uid}/pushTokens/${target.tokenId}`] = null;
    } else {
      console.error(`Expo push ticket failed for ${alertId}`, ticket.message || ticket.details?.error || 'Unknown error');
    }
  }
  if (Object.keys(receiptWrites).length) await rootRef.update(receiptWrites);
  console.info(`onAccidentAlertCreated ${alertId}: ${accepted}/${tickets.length} Expo push tickets accepted, SMS status: ${aggregateSmsStatus}`);
  return { notifications: owners.length, tickets: accepted, smsStatus: aggregateSmsStatus };
}

exports.onAccidentAlertCreated = onValueCreated(
  { ref: '/alerts/{deviceId}/{alertId}', retry: true },
  async (event) => {
    const alert = event.data.val();
    if (!alert || typeof alert !== 'object' || (alert.status && alert.status !== 'new')) return null;

    const { deviceId, alertId } = event.params;
    const { dispatchRef, result } = await claimDispatch(deviceId, alertId);
    if (!result.committed) {
      if (result.snapshot.val()?.status === 'sent') return null;
      throw new Error(`Accident alert ${alertId} is already being dispatched; retrying.`);
    }

    try {
      const result = await publishAccidentAlert(alert, deviceId, alertId);
      await dispatchRef.update({ status: 'sent', completedAt: Date.now() });
      return result;
    } catch (error) {
      await dispatchRef.update({
        status: 'failed',
        failedAt: Date.now(),
        error: String(error.message || error).slice(0, 500),
      });
      throw error;
    }
  }
);

exports.checkExpoPushReceipts = onSchedule(
  { schedule: 'every 15 minutes', retryCount: 3 },
  async () => {
    const snapshot = await admin.database().ref('pushReceipts').once('value');
    const cutoff = Date.now() - RECEIPT_DELAY_MS;
    const pending = [];
    snapshot.forEach((userSnapshot) => {
      userSnapshot.forEach((receiptSnapshot) => {
        const record = receiptSnapshot.val();
        if (record?.createdAt <= cutoff) {
          pending.push({
            uid: userSnapshot.key,
            ticketId: receiptSnapshot.key,
            tokenId: record.tokenId,
          });
        }
      });
    });

    let checked = 0;
    for (let offset = 0; offset < pending.length; offset += 100) {
      const batch = pending.slice(offset, offset + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: batch.map((receipt) => receipt.ticketId) }),
      });
      if (!response.ok) {
        throw new Error(`Expo receipt request failed (${response.status}): ${await response.text()}`);
      }

      const result = await response.json();
      if (!result.data || typeof result.data !== 'object') {
        throw new Error('Expo receipt service returned an invalid response.');
      }
      const receipts = result.data || {};
      const updates = {};
      for (const receipt of batch) {
        const delivery = receipts[receipt.ticketId];
        if (!delivery) continue;
        if (delivery.details?.error === 'DeviceNotRegistered') {
          updates[`users/${receipt.uid}/pushTokens/${receipt.tokenId}`] = null;
        }
        updates[`pushReceipts/${receipt.uid}/${receipt.ticketId}`] = null;
        checked += 1;
      }
      if (Object.keys(updates).length) await admin.database().ref().update(updates);
    }
    console.info(`checkExpoPushReceipts: checked ${checked} receipts`);
    return null;
  }
);
