# Firebase and push setup

This is the live-backend setup for Person 2's part of the shared contract. The app uses live mode by default; set `EXPO_PUBLIC_DATA_SOURCE=demo` to opt into mock data. Demo mode does not initialize Firebase or request push permissions.

## 1. Create the Firebase project

1. Create a Firebase project and a Realtime Database. Keep the database in its intended production region; the URL is required by the app.
2. In **Authentication → Sign-in method**, enable **Anonymous**. The app signs in automatically and Firebase Auth persists that anonymous user on the device. Contacts, settings, notifications, and push tokens are private to that installation. Reinstalling the app or clearing its data creates a new anonymous identity; there is no account recovery or cross-device sync.
3. Add the Android app package `com.smarthelmet.app` in Firebase. Use the same Firebase project for the app and Cloud Functions.
4. Configure the Expo push credentials for the Android and iOS app in EAS. Push notifications require a development or production build; they do not work in Expo Go on Android.

## 2. Configure the Expo app

Create `frontend/.env.local` (it is ignored by Git) with the Firebase web-app values and EAS project ID:

```dotenv
EXPO_PUBLIC_DATA_SOURCE=live
EXPO_PUBLIC_DEVICE_ID=HELMET_001
EXPO_PUBLIC_EAS_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Firebase web configuration values are client identifiers, not administrator credentials. Security comes from Authentication and the Realtime Database rules below. Never put a Firebase service-account key, Admin SDK credential, Expo access token, or helmet custom token in this file or the app bundle.

Run `eas project:init` from `frontend/`, then copy the EAS project ID into `EXPO_PUBLIC_EAS_PROJECT_ID`. `frontend/app.config.js` exposes it to `expo-notifications`. Build a development client with `npx eas-cli@latest build --profile development --platform android` (or `ios`) before testing remote push.

## 3. Deploy database rules and functions

From `backend/`, run:

```sh
npm --prefix functions install
npx firebase-tools deploy --only database,functions
```

The rules deny access by default. Signed-in app users can access only `users/{theirUid}/...`. Owners explicitly provisioned at `deviceOwners/{deviceId}/{uid}` can read that helmet's telemetry and alerts. The helmet identity, whose Firebase ID token has the custom claim `device_id` matching its device ID, can write its telemetry/alerts and read only one exact alert record to recover an interrupted upload; it cannot list telemetry or alert history. Admin SDK access used by Cloud Functions and the provisioning script bypasses these client rules.

Do not restore public `.read` or `.write` rules for development. Use demo mode or the Firebase Emulator Suite instead.

Run backend tests from `backend/functions/`:

```sh
npm test
npm run test:rules
```

The rules test starts the Realtime Database emulator and checks anonymous/stranger denial, owner-only reads and alert resolution, device-writer permissions, contact isolation, and push-token validation.

## 4. Provision an owner and helmet writer

An app installation's anonymous UID appears in Firebase Console under **Authentication → Users** after it first opens in live mode. Keep that UID private; it is not a password, but it identifies the account that owns the installation's data.

From `backend/functions/`, with Node.js 20 installed and Application Default Credentials authorized for the same Firebase project, run:

```sh
set FIREBASE_DATABASE_URL=https://YOUR_DATABASE_URL
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
node scripts/provision-device.js HELMET_001 ANONYMOUS_USER_UID
```

PowerShell equivalent:

```powershell
$env:FIREBASE_DATABASE_URL = "https://YOUR_DATABASE_URL"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
node scripts/provision-device.js HELMET_001 ANONYMOUS_USER_UID
```

The script grants that UID read access to the helmet and creates a device identity with the required `device_id` custom claim. It prints a short-lived Firebase custom token for secure, one-time provisioning to the ESP32. The firmware must exchange it with Firebase Auth for a refresh token, store the refresh token securely, refresh ID tokens, and send authenticated requests. Never commit or share either token. The app does not yet include a device-pairing screen; provision access through this trusted script.

## Database layout

```text
devices/{deviceId}                         // ESP32 telemetry
alerts/{deviceId}/{alertId}                // ESP32 writes; an owner can only resolve status
deviceOwners/{deviceId}/{uid}              // Admin-only owner allowlist
users/{uid}/contacts/{contactId}            // private app contacts
users/{uid}/notifications/{notificationId}  // private in-app inbox
users/{uid}/settings                        // notification preferences
users/{uid}/pushTokens/{tokenId}             // Expo push tokens; private to the user
pushReceipts/{uid}/{ticketId}               // Admin-only Expo delivery receipts
pushDispatches/{deviceId}/{alertId}          // Admin-only trigger idempotency records
```

Device shape: `deviceId`, `helmetStatus`, `accidentStatus`, `latitude`, `longitude`, `gpsValid`, `gpsLastFixAt`, `gsmRegistered`, `mpuOk`, `batteryLevel`, `alcoholDetected`, and `lastUpdated`.

Alert shape: `timestamp`, `severity`, `latitude`, `longitude`, `gpsValid`, `status`, `smsStatus`, and `deviceId`. `status` is `new`, `sent`, or `resolved`; `smsStatus` is `pending`, `confirmed`, `failed`, or `unknown`. Viewing an alert never changes its status. The only app-side alert write allowed by the rules is setting its status to `resolved`.

The app's emergency contacts are **not** written to the helmet's SMS recipient. Firmware uses the separately configured `SMS_RECIPIENT_E164` number; changing contacts in the app does not change that device setting.

## 5. ESP32 firmware (prototype)

The Arduino IDE reference firmware is in `firmware/KavachHelmet/`. It targets ESP32 + MPU6050 + NEO-6M GPS + SIM900A and writes the `devices/{deviceId}` and `alerts/{deviceId}/{alertId}` records above. Follow its README for wiring, Arduino libraries, local `config.h`, provisioning-token entry over USB serial, and test steps.

The firmware's SMS destination is configured locally as `SMS_RECIPIENT_E164`; it is not synced from app contacts. The SIM900A only reports SMS submission acceptance, not delivery, so the reference firmware reports `smsStatus: "unknown"` unless the modem rejects the send (`"failed"`). The impact threshold is an uncalibrated prototype default, not a validated accident-detection threshold.

Do not use this prototype as a safety-certified emergency system. Hardware behavior, power stability, carrier 2G support, impact false-positive/false-negative rates, token storage, alert persistence during outages, and actual SMS delivery need testing on the assembled device. The sketch persists and retries one pending alert; additional impacts while one remains pending are not queued. ESP32 NVS is not encrypted by this sketch.

## Push notification flow

The app requests permission, obtains an `ExpoPushToken` for the configured EAS project, and stores it under the installation's authenticated UID. A new alert creates a private in-app notification for each provisioned owner. If that owner's push preference is enabled, the Cloud Function sends an Expo push containing `{ type: "accident", alertId, deviceId }`. Tapping it opens Alert Details.

Expo Push Service bridges FCM and APNs, avoiding the invalid assumption that an Expo token can be sent directly with Firebase Admin's FCM API. The function retries transient send failures, records push tickets, and a scheduled function checks receipts every 15 minutes and removes tokens reported as unregistered. Deploying that scheduled receipt checker requires a billing-enabled Firebase/Google Cloud project and Cloud Scheduler.

Expo push credentials still need to be configured in EAS for each platform. A successful push ticket means Expo accepted the message, not that the phone displayed it; use the receipt checker and test on a development build.

## End-to-end integration smoke test

After deploying to a dedicated test Firebase project and setting up the development build:

1. Start the app in live mode and confirm an anonymous Auth user appears. Record its UID and provision that UID for the matching `EXPO_PUBLIC_DEVICE_ID`.
2. Configure the firmware's local `config.h`, flash the ESP32, and provision the one-time token through the USB serial monitor. Confirm the serial output shows Wi-Fi and Firebase authentication.
3. Confirm fresh telemetry appears in the app within 30 seconds. Move the GPS outdoors for a valid fix, then verify that removing the fix stops the app from displaying coordinates.
4. Trigger a test alert only using a safe fixture. Confirm one alert record appears, the app displays it, the Cloud Function creates the owner's inbox notification, and an opted-in development build receives a push.
5. Confirm the configured SIM900A recipient receives the SMS. Treat the app's SMS status as `unknown` after modem acceptance; do not treat network submission as proof of delivery.
6. Restart the device while an alert is queued and verify it retries without creating duplicate alert records or sending a duplicate SMS. Also test Wi-Fi loss, GSM registration loss, and GPS unavailability.

Use test phone numbers and a non-production Firebase project for this check. Do not test impact detection by striking a helmet worn by a person. Record the board/module revisions, wiring, power supply, firmware configuration (excluding credentials), and results so the impact thresholds and hardware assumptions can be reviewed.
