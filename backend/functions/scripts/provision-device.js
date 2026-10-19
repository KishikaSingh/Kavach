const admin = require('firebase-admin');

const [deviceId, ownerUid] = process.argv.slice(2);
const databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;

if (!deviceId || !/^[A-Za-z0-9_-]+$/.test(deviceId) || !ownerUid || !/^[A-Za-z0-9_-]+$/.test(ownerUid) || !databaseURL) {
  console.error(
    'Usage: node scripts/provision-device.js <deviceId> <ownerUid> (letters, numbers, _ and - only)\n' +
      'Set FIREBASE_DATABASE_URL and GOOGLE_APPLICATION_CREDENTIALS first.'
  );
  process.exitCode = 1;
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL,
  });

  async function provision() {
    const uid = `helmet-${deviceId.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
    try {
      await admin.auth().getUser(uid);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      await admin.auth().createUser({ uid, displayName: `Helmet ${deviceId}` });
    }

    await admin.database().ref(`deviceOwners/${deviceId}/${ownerUid}`).set(true);
    const customToken = await admin.auth().createCustomToken(uid, { device_id: deviceId });
    console.log(
      JSON.stringify(
        {
          deviceId,
          ownerUid,
          deviceUid: uid,
          customToken,
          note: 'Exchange this short-lived custom token for a Firebase refresh token on the helmet. Never commit or share this token.',
        },
        null,
        2
      )
    );
  }

  (async () => {
    try {
      await provision();
    } catch (error) {
      console.error('Could not provision the helmet.', error);
      process.exitCode = 1;
    } finally {
      await admin.app().delete();
    }
  })();
}
