# Hardware-Free Testing Workflow for Kavach

This guide provides a complete, repeatable workflow for testing the Kavach Smart Helmet mobile application and backend without physical helmet hardware (ESP32, MPU6050, NEO-6M GPS, SIM800L) and without touching production Firebase data.

---

## 1. Architecture Overview

Kavach supports two complementary tiers of hardware-free testing:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TESTING WORKFLOWS                             │
├───────────────────────────────────┬─────────────────────────────────────┤
│ 1. In-App Demo Mode               │ 2. Firebase Emulator Suite          │
│    (Zero Backend / Pure In-Memory)│    (Full Database & Function Stack) │
│ - Instant scenario switching      │ - Real Firebase Realtime Database   │
│ - Live telemetry controls         │ - Real Auth & Security Rules        │
│ - Simulated accident triggers     │ - Repeatable Seed & Reset Scripts   │
│ - Zero network requests           │ - Cloud Functions event dispatch    │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. In-App Demo Mode

### Activating Demo Mode
Demo Mode can be enabled at build/startup via the environment variable in `frontend/.env.local`:

```dotenv
EXPO_PUBLIC_DATA_SOURCE=demo
```

### Features & Controls
When Demo Mode is active:
1. **Interactive Demo Controls Bar**: Positioned at the top of the app with a visible `DEMO MODE` badge.
2. **Quick Accident Trigger**: Tap **🚨 Trigger Accident** to instantly simulate an impact event.
3. **Granular Telemetry Controls** (tap **Controls ▼**):
   - **Battery**: Simulate unsupported sensor (`null`), low battery (`15%`), or healthy battery (`85%`).
   - **Connectivity**: Toggle ESP32 link between `Connected` and `Offline` (simulating 30s+ silence).
   - **GPS Status**: Toggle between `Available` (live fix), `Searching`, `Stale` (>5 min old), or `No Fix`.
   - **Hardware Sensors**: Toggle MPU6050 sensor fault and GSM registration state.
   - **Scenarios**: Switch between `normal`, `newAlert`, `gpsUnavailable`, `gpsStale`, `offline`, `sensorFault`, `gsmUnregistered`, `batterySupported`, and `emptyDevice`.
   - **Reset**: Tap **↺ Reset All** to return to standard healthy helmet state.

---

## 3. Firebase Emulator Suite Setup

The Firebase Emulator Suite provides an isolated local Firebase environment that mirrors the exact production Realtime Database and Cloud Functions without contacting Google Cloud or AWS.

### Prerequisites
- Node.js 18+ or 20+
- Java Runtime Environment (JRE 11+) for Firebase Local Emulator
- `firebase-tools` CLI (`npm install -g firebase-tools` or via `npx`)

### Emulator Port Configuration (`backend/firebase.json`)
- **Realtime Database**: `127.0.0.1:9000`
- **Authentication**: `127.0.0.1:9099`
- **Cloud Functions**: `127.0.0.1:5001`
- **Emulator UI**: `http://localhost:4000`

### Starting the Emulators
From the `backend/` directory:

```bash
npx firebase-tools emulators:start --only database,auth,functions --project demo-kavach
```

Or run automated rules tests inside an ephemeral emulator:

```bash
npm --prefix functions run test:rules
```

### Connecting the Expo App to the Emulator
In `frontend/.env.local`:

```dotenv
EXPO_PUBLIC_DATA_SOURCE=live
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
EXPO_PUBLIC_DEVICE_ID=HELMET_DEV_001

# For Android Emulator: 10.0.2.2
# For iOS Simulator / Web: 127.0.0.1
# For Physical Phone on Wi-Fi: <Your-Computer-LAN-IP>
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
```

---

## 4. Repeatable Seed & Reset Scripts

Seed and reset scripts are located in `backend/functions/scripts/`.

### 1. Seeding Test Data
Populates the dedicated development device (`HELMET_DEV_001`), helmet ownership permissions, fictional emergency contacts, settings, and sample alerts:

```bash
npm --prefix backend/functions run seed
```

**Seeded Data Summary:**
- **Device Record (`/devices/HELMET_DEV_001`)**:
  - `deviceId`: `"HELMET_DEV_001"`
  - `helmetStatus`: `"connected"`
  - `accidentStatus`: `"normal"`
  - `latitude`: `28.6692`, `longitude`: `77.4538`, `gpsValid`: `true`
  - `gsmRegistered`: `true`, `mpuOk`: `true`
- **Ownership Permission (`/deviceOwners/HELMET_DEV_001/test-user-dev`)**: `true`
- **Fictional Emergency Contacts (`/users/test-user-dev/contacts`)**:
  - `Dr. Vikram Sarabhai` (`+919999900001`, Primary)
  - `Dr. APJ Abdul Kalam` (`+919999900002`, Secondary)
  - `Prof. Satish Dhawan` (`+919999900003`, Secondary)
- **Settings (`/users/test-user-dev/settings`)**:
  - `{ notifications: { push: true, sound: true } }`
- **Sample Alerts (`/alerts/HELMET_DEV_001`)**:
  - `alert_dev_1`: High severity, new alert, pending SMS
  - `alert_dev_2`: Medium severity, sent, confirmed SMS
  - `alert_dev_3`: Low severity, resolved, no GPS

### 2. Resetting Test Data
Removes all test device telemetry, permissions, alerts, contacts, and notifications:

```bash
npm --prefix backend/functions run reset
```

---

## 5. Dedicated Development Firebase Project (Cloud Option)

If testing on cloud infrastructure rather than the local emulator:
1. Create a separate Firebase project (e.g., `kavach-development`), NEVER use the production project ID.
2. In `frontend/.env.local`, specify the development project's credentials.
3. Deploy rules using `npx firebase-tools deploy --only database --project kavach-development`.
4. Run the seed script targeting the cloud database:
   ```bash
   FIREBASE_DATABASE_URL="https://kavach-development-default-rtdb.firebaseio.com" npm --prefix backend/functions run seed
   ```

---

## 6. Safety & Verification

### Safety Guarantees
- **Mocked Emergency SMS**: In Demo Mode and during Emulator execution (`FUNCTIONS_EMULATOR=true` or `MOCK_EMERGENCY_DISPATCH=true`), real SMS is disabled by default. Simulated emergency contacts receive mock dispatches.
- **Strict Security Rules**: `backend/firebase/database.rules.json` enforces authentication and device ownership. Rules are never loosened for testing.

### Automated Test Commands
Run all automated test suites to verify functionality:

```bash
# 1. Run frontend test suites (76 tests covering all services, hooks, screens)
cd frontend
npm test

# 2. Run backend functions and SNS tests
cd ../backend/functions
npm test

# 3. Verify Expo environment and configuration
cd ../../frontend
npx expo-doctor
npm run lint
```

---

## 7. Limitations

- **Simulated vs. Physical IMU**: Demo Mode tests software threshold filtering and alert dispatch logic, but does not simulate physical MEMS accelerometer noise or vibration calibration.
- **Cellular Network Latency**: Physical SIM800L module latency and AT command timeout recovery are tested via software contracts, but real carrier signal dropouts require hardware validation.
- **Push Notification on Expo Go**: Remote Expo Push Notifications require a development build (`eas build --profile development`); in Expo Go or web, in-app notifications are used.
