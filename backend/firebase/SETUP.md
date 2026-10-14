# Firebase setup (Person 2)

The app has two data modes, switched by `src/config.js` (already in the repo from Person 3):

- `EXPO_PUBLIC_DATA_SOURCE` unset or anything other than `live` → **demo** (in-memory mock data, no Firebase).
- `EXPO_PUBLIC_DATA_SOURCE=live` → **live** (Firebase Realtime Database).

Person 2 does **not** own `config.js`. It already defines `DATA_SOURCE`, `DISCONNECT_AFTER_MS`, and `GPS_STALE_AFTER_MS`. Firebase project keys stay in Expo public env vars (below) so we do not fork or duplicate that file.

## Ownership

| Path | Owner |
| --- | --- |
| `src/services/firebaseService.js` | Person 2 |
| `src/services/notificationService.js` | Person 2 (FCM / Expo push; not the in-app inbox) |
| `firebase/` and `functions/` | Person 2 |
| `src/hooks/*`, other `src/services/*`, `src/data/*`, `src/utils/*`, `src/config.js` | Person 3 |
| App shell, navigation, Home / Device / Settings / Notifications screens | Person 1 |

## Packages

The repository currently has **no root `package.json`**. Do not add Firebase to demo-only runs until Person 1 scaffolds Expo.

When the Expo app exists, add these **only for live / push**:

- `firebase` — JS SDK for Realtime Database (same API the live backend functions use).
- `expo-notifications` — device push permission + FCM/APNs token. Optional until push is wired in `App`.
- Cloud Functions (this folder): `firebase-admin` and `firebase-functions` in `functions/package.json`.

Demo mode never imports these modules. Screens never import Firebase; they use Person 3 hooks.

## Env vars (Expo)

```
EXPO_PUBLIC_DATA_SOURCE=live
EXPO_PUBLIC_DEVICE_ID=HELMET_001
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## Realtime Database layout

```
devices/{deviceId}             // helmet telemetry (shape of mockData.emptyDevice)
alerts/{alertId}               // accident records; id is the key
contacts/{contactId}           // emergency contacts
notifications/{notificationId} // in-app inbox documents
settings                       // { accidentThreshold, notifications: { push, sound } }
fcmTokens/{tokenId}            // { token, platform, updatedAt }
```

`app` is not stored in RTDB. `subscribeApp` reports `{ dataSource: 'live', backendReachable }` from Firebase `.info/connected`.

### Device record

```
deviceId, helmetStatus, accidentStatus, latitude, longitude, gpsValid,
gpsLastFixAt, gsmRegistered, mpuOk, batteryLevel, alcoholDetected, lastUpdated
```

### Alert record

```
timestamp, severity, latitude, longitude, gpsValid, status, smsStatus, deviceId
```

`status`: `new` | `sent` | `resolved`. `smsStatus`: `pending` | `confirmed` | `failed` | `unknown`.

Viewing an alert must never change `status`. Only `resolveAlert(id)` may set `resolved`.

### Contact record

```
name, phone, isPrimary
```

Phone values are E.164 (`+91…`). Validation stays in Person 3 `contactService` / `validators.js`; Firebase writes assume already-clean data.

## Deploy

1. Create a Firebase project. Enable **Realtime Database** and **Cloud Messaging**.
2. Copy `firebase/database.rules.json` (or the copy at repo root) and publish rules.
3. From `functions/`: `npm install` then `firebase deploy --only functions,database`.
4. Person 3 must return this module from `getLiveBackend()` in `src/services/liveAdapter.js` (they already documented the exact snippet). Until that one-line hook-up, live mode correctly errors with `LIVE_NOT_CONNECTED` instead of silently using demo data.

## Cloud Function

`onAccidentAlertCreated` runs when `/alerts/{alertId}` is created with `status === "new"` (or missing status). It sends an FCM data+notification message to every token under `/fcmTokens`. Taps should open `AlertDetails` with `{ alertId }`.

## config.js decision

**Keep Person 3’s `src/config.js` unchanged.** It is the data-source switch and GPS/disconnect timings used by `useDevice` / `deriveDevice`. Firebase credentials are env-only so Person 2 does not need to claim that file. If a future shared constant is needed (for example `DEVICE_ID`), Person 3 can add `EXPO_PUBLIC_DEVICE_ID` next to `DATA_SOURCE`; until then `firebaseService` reads the env var with fallback `HELMET_001`.
