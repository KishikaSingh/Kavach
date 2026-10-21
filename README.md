# Smart Helmet (Kavach)

Expo mobile app and Firebase backend for a smart helmet accident-alert system. The helmet detects an impact,
texts an emergency number with the GPS location and writes the alert to Firebase; the app (React Native + Expo,
Android first) shows helmet status, location, alerts and contacts.

- **Expo app:** `frontend/`
- **Firebase Realtime Database rules and Cloud Functions:** `backend/`
- **ESP32 reference firmware (Arduino IDE):** `firmware/KavachHelmet/`
- **Firebase, anonymous-auth, EAS push, deployment, and device-provisioning setup:** [`backend/firebase/SETUP.md`](backend/firebase/SETUP.md)
- **Ownership and integration notes:** [`docs/INTEGRATION_NOTES.md`](docs/INTEGRATION_NOTES.md)

```
Helmet (ESP32 + MPU6050 + NEO-6M GPS + SIM900A)
   |  SMS straight to the emergency numbers (mobile network)
   |  Wi-Fi -> Firebase Realtime Database (signed in as the helmet):  /devices/{deviceId}   /alerts/{deviceId}/{alertId}
   v
Firebase  --->  Mobile app (this repo)  and  web dashboard
   |
   +-- Cloud Function writes an in-app notification and sends a push when a new alert is created
```

## Quick start (demo mode, opt-in)

Needs a current Node.js LTS and the **Expo Go** app on an Android phone (same Wi-Fi as the computer).

```bash
cd frontend
npm install
npx expo start -c
```

To opt into mock data, set `EXPO_PUBLIC_DATA_SOURCE=demo` in `frontend/.env.local`, then scan the QR code with Expo Go.
A small **Demo** button switches the simulated helmet between situations such as *New accident alert*, *GPS unavailable* and *Helmet offline*.
Step-by-step demo script: [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

## Run the tests

```bash
cd frontend
npm install          # once
npm test             # app + data layer + Firebase contract, about 10 seconds, no internet needed
npm run test:firmware  # firmware logic tests, needs g++ and make (they live in ../firmware)
```

What `npm test` checks (details in [docs/TESTING.md](docs/TESTING.md)):

- the demo data layer (services, validation, derived device state) and the data hooks;
- live mode against an in-memory Firebase: device, alerts, contacts, notifications, settings, push tokens;
- **the firmware contract**: the JSON the firmware really sends is accepted by the database rules and shown correctly in the app;
- repository consistency: imports resolve, packages are declared, rules, Cloud Function, app and firmware agree on `/alerts/{deviceId}/{alertId}`, secrets are git-ignored.

## Live mode (real Firebase)

1. Set up the Firebase project first (Anonymous sign-in, rules, Functions, device provisioning): [backend/firebase/SETUP.md](backend/firebase/SETUP.md).
2. In `frontend/`, copy `.env.example` to `.env.local` and fill the `EXPO_PUBLIC_FIREBASE_*` values. Live mode is the default; mock data is only used when `EXPO_PUBLIC_DATA_SOURCE=demo`.
3. Restart with `npx expo start -c` (environment values are read at start).
4. The app signs in anonymously; that user must be granted access to the helmet with `provision-device.js` (SETUP.md), otherwise the rules show no data.

`EXPO_PUBLIC_DEVICE_ID` (default `HELMET_001`) must match `DEVICE_ID` in the firmware `config.h`.
Without the Firebase values, live mode shows a clear "not connected" error; it never falls back to fake data.

## Build an Android APK

EAS Build produces an installable APK. Steps: [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md).

## Firmware

The firmware to flash is **`firmware/KavachHelmet`** (Arduino IDE sketch, ESP32 + MPU6050 + NEO-6M + SIM900A; README inside).
Bench bring-up checklist (flash, Wi-Fi/Firebase, GPS, SIM registration, SMS, threshold calibration): [firmware/BRINGUP.md](firmware/BRINGUP.md).

`firmware/smart_helmet` is an earlier, separate prototype (cancel button, SMS delivery reports, PC-tested logic). It signs in with
email/password, which the current database rules reject, so **do not flash it** unless it is ported to the custom-token sign-in. See [firmware/README.md](firmware/README.md).
Neither firmware has been run on real hardware yet. It is a prototype, not a validated safety device.

## Project layout

| Path | What | Owner |
|---|---|---|
| `frontend/App.js`, `frontend/src/navigation`, `frontend/src/screens` (Dashboard, Device Settings, Notifications, Profile, Splash, Onboarding), `frontend/src/components` | App shell and UI | Person 1 |
| `frontend/src/screens` (Location, Alerts, AlertDetails, Contacts, ContactForm), `frontend/src/services/firebaseService.js`, `frontend/src/services/notificationService.js`, `backend/` (Firebase rules, Cloud Function) | Screens, Firebase, push | Person 2 |
| `frontend/src/hooks`, `frontend/src/services` (other files), `frontend/src/data`, `frontend/src/utils`, `frontend/src/config.js`, `frontend/tests`, `firmware/`, `docs/` | Data layer, tests, hardware bring-up, build | Person 3 |

How the pieces fit together: [docs/INTEGRATION_NOTES.md](docs/INTEGRATION_NOTES.md). Data hooks and the backend contract: [docs/PERSON3_README.md](docs/PERSON3_README.md).

## Status

| Area | State |
|---|---|
| App in demo mode | Working (Expo Go) |
| Data layer, hooks, live mode against a simulated Firebase | Tested (`npm test`) |
| Firmware (`KavachHelmet`) | Written, **not yet compiled or run on an ESP32** |
| Live mode with the real Firebase project | Not yet tested |
| Push notifications on a phone | Wired in the app and Cloud Function; needs an APK, EAS project id and FCM credential (not Expo Go) |
| Android APK | Config ready (`eas.json`); build not yet run |

## Known limits

- The helmet texts the number in its own `config.h` (`SMS_RECIPIENT_E164`); the contact list in the app is not read by the helmet.
- The impact threshold (3.0 g) is an untuned default; calibrate on a safe test fixture, never on a person.
- SIM900A is 2G only; check that the local carrier still offers 2G. The SMS status stays `unknown` because the modem only confirms submission.
- The helmet writes `accidentStatus` `normal`, `warning` or (on the telemetry sent at an impact) `alert`, and creates the alert record.
- The app has no helmet pairing screen; the owner is granted with `provision-device.js`.
