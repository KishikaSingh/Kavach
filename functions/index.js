const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

function shouldNotify(alert) {
  if (!alert || typeof alert !== 'object') return false;
  const status = alert.status || 'new';
  return status === 'new';
}

function mapsHint(alert) {
  const lat = alert.latitude;
  const lng = alert.longitude;
  if (alert.gpsValid === true && typeof lat === 'number' && typeof lng === 'number') {
    return `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  return 'GPS was not valid when this alert was recorded. Open the app for details.';
}

// Sends a push when a new accident alert document is created.
// Viewing or resolving an alert in the app does not trigger this.
exports.onAccidentAlertCreated = functions.database
  .ref('/alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.val();
    const alertId = context.params.alertId;
    if (!shouldNotify(alert)) return null;

    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensNode = tokensSnap.val() || {};
    const tokens = Object.values(tokensNode)
      .map((row) => (row && row.token) || (typeof row === 'string' ? row : null))
      .filter(Boolean);

    if (!tokens.length) {
      console.log('onAccidentAlertCreated: no FCM tokens, skip', alertId);
      return null;
    }

    const severity = alert.severity || 'unknown';
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Accident detected',
        body: mapsHint(alert),
      },
      data: {
        type: 'accident',
        alertId: String(alertId),
        severity: String(severity),
        deviceId: String(alert.deviceId || ''),
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    console.log(
      `onAccidentAlertCreated ${alertId}: ${response.successCount} sent, ${response.failureCount} failed`
    );
    return { successCount: response.successCount, failureCount: response.failureCount };
  });
