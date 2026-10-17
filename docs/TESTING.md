# Testing

## Automatic tests

```bash
cd frontend
npm install
npm test                 # runs everything under frontend/tests/
npm test -- firmware     # only test files whose path contains "firmware"
npm run test:firmware    # C++ logic tests (g++ and make; they live in ../firmware)
```

`npm test` bundles each `tests/*.test.js` with esbuild and runs it with Node's built-in test runner
(no Jest, no emulator, no internet). `firebase/app`, `firebase/auth`, `firebase/database`, `react-native` and async-storage are replaced by fakes (`frontend/tests/fakes`; the fake user is already signed in anonymously as `test-user-1`),
and `react` by a tiny stand-in so the data hooks run without a screen.

| File | Covers |
|---|---|
| `demo-data-layer.test.js` | Demo services: phone/name validation, derived device rules per scenario, contacts (duplicates, primary), resolving alerts, notifications, settings, subscriptions |
| `hooks.test.js` | The hooks screens use (`useDevice`, `useAlerts`, `useContacts`, `useNotifications`, `useSettings`, `useDemoControls`), named and default exports |
| `live-firebase.test.js` | Live mode end to end through `liveAdapter` and `firebaseService` with an in-memory Firebase: alerts read from `/alerts/{deviceId}`, resolve, contacts, notifications, settings, push token key, unsubscribe |
| `live-not-configured.test.js` | Live mode without Firebase values shows `LIVE_NOT_CONNECTED`, never fake data |
| `firmware-contract.test.js` | The JSON the firmware really sends (`frontend/tests/fixtures/firmware-payloads.json`) passes the database rules and is shown correctly (no GPS means no coordinates; "SMS delivered" only for `confirmed`) |
| `static.test.js` | Imports resolve, packages declared, rules / Cloud Function / app / firmware use the same alert path and `DEVICE_ID`, `.env` and `config.h` are git-ignored, `app.json` is lowercase, Android build config present |

### When you change the firmware payloads

```bash
cd firmware && make fixtures && cd ../frontend   # regenerates frontend/tests/fixtures/firmware-payloads.json from payloads.h
npm test
git add tests/fixtures
```

### Adding a test

Create `frontend/tests/<name>.test.js`, use `node:test` and `node:assert/strict`. For live-mode tests start the file with
`import './helpers/live-env.js';` and reset the fake in `beforeEach(() => fake.__reset())`
(`import * as fake from 'firebase/database'`; `fake.__write(path, value)` plays the part of the helmet).

### What these tests do not cover

Screens and navigation (UI), real Firebase, push notifications, and the ESP32 hardware. Use the manual checklist below.

## Manual checklist (before a demo or submission)

**App, demo mode (Expo Go or APK)**
- [ ] Splash and onboarding appear on first launch, then Home.
- [ ] Every tab opens without an error: Home, Location, Alerts, Contacts, Settings; Notifications and Profile open from Home.
- [ ] Demo button: *New accident alert* shows a red active alert; Alerts tab lists it; opening it does **not** resolve it; "Mark as resolved" does.
- [ ] *GPS unavailable*: Location shows no map marker and no coordinates.
- [ ] *Helmet offline*: Home and Location show disconnected.
- [ ] Contacts: add (valid number), duplicate rejected, make primary, delete (with confirmation).

**App, live mode** (needs `frontend/.env` and the Firebase project)
- [ ] Home shows "live", not "demo"; no demo banner.
- [ ] Writing `/devices/HELMET_001` in the Firebase console updates Home within a second or two.
- [ ] Creating `/alerts/HELMET_001/test1` (status `new`, timestamp) shows in Alerts; resolving it changes the database.

**Firmware on the bench**: follow [firmware/README.md](../firmware/README.md), section 5.

**End to end**: helmet (`firmware/KavachHelmet`) on Wi-Fi, app in live mode with the provisioned user. Tap the helmet on the bench until an alert prints: SMS arrives on the phone, the alert appears in the app. Full hardware checklist: `firmware/BRINGUP.md`.
