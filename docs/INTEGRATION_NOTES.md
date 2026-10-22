# Integration notes

The current repository is organized into `frontend/` (Expo app) and `backend/` (Firebase rules and Cloud Functions). The Person 2 implementation is connected to the shared hooks through `frontend/src/services/liveAdapter.js`.

## Person 2 integration

- Live Firebase uses persistent anonymous Authentication. Contacts, settings, notifications, and Expo push tokens are scoped to `users/{uid}`.
- Owner reads of helmet telemetry/alerts require an admin-provisioned `deviceOwners/{deviceId}/{uid}` entry. The device identity, authenticated with a custom `device_id` claim, can read only an exact alert record for retry recovery and can write its own device/alert data; `backend/functions/scripts/provision-device.js` creates the device identity and owner grant.
- The alert-created Cloud Function writes an in-app notification and sends an Expo push only for owners with push enabled. Expo tickets and delivery receipts are tracked; invalid device tokens are removed.
- Push response taps route to `AlertDetails`. Expo push setup requires an EAS project ID and native push credentials; see `backend/firebase/SETUP.md`.
- `backend/firebase/database.rules.json` denies unauthenticated and cross-user access. Admin SDK provisioning and Cloud Functions are the only writers to owner mappings, push receipts, and dispatch records.

## Emergency contact notification (app-side)

The app includes an automated emergency contact notification feature (`frontend/src/services/emergencyNotificationService.js`):

- **Trigger & Confidence Threshold**: When an accident alert is detected (from Firebase or demo scenarios), the service calculates incident confidence (`high` = 0.95, `medium` = 0.75, `low` = 0.35, or explicit numeric `confidence`). Notifications are only dispatched if confidence meets the configured threshold (default `0.60`), preventing false alarms on minor bumps.
- **Incident Details & Location**: Incident notifications include the rider's name, formatted detection time, and location. If valid GPS coordinates are present, a Google Maps link (`https://www.google.com/maps?q=lat,lng`) is included. If GPS is unavailable, the message gracefully reports location as unavailable without crashing.
- **Contact Validation**: Registered contacts are validated against E.164 phone formats using `normalizePhone`, and primary contacts are prioritized. If no valid contacts exist, the system logs a `no_contacts` state and guides the user to register emergency contacts.
- **Duplicate Suppression & Safe Retry**: Each alert is tracked by `alertId`. Successful notifications are recorded in `AsyncStorage` (`@kavach:emergency_dispatches`) and memory. Repeated triggers for the same incident are automatically suppressed. Failed deliveries allow explicit retry from the UI without corrupting state.
- **Gateway Integration Boundary**:
  - Live SMS dispatch requires an SMS gateway/webhook endpoint set in `frontend/.env.local`:
    ```dotenv
    EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL=https://your-sms-gateway.com/api/send
    EXPO_PUBLIC_EMERGENCY_SMS_API_KEY=your-optional-api-key
    ```
  - When unconfigured in live mode, the system sets status to `unconfigured` (it never falsely claims messages were sent) and offers a native SMS draft fallback (`sms:+91...?body=...`).
  - In demo mode, simulated dispatches are recorded as `demo_sent`.
- **User Feedback & In-App Recording**: `AlertDetailsScreen` displays an interactive `EmergencyDispatchBanner` showing delivery status (`sending`, `sent`, `demo_sent`, `unconfigured`, `failed`, `no_contacts`), and records dispatch outcomes into the in-app notification center.

## Remaining integration dependencies

- The Arduino IDE reference firmware for ESP32 + MPU6050 + SIM900A + NEO-6M is in `firmware/KavachHelmet/`. It matches the current device/alert schema and custom-claim provisioning flow, but remains prototype code until compiled and tested on the exact hardware, calibrated, and verified end-to-end.
- The reference firmware has a configurable fixed SMS recipient; it does not sync app contacts. SIM900A submission acceptance is not delivery confirmation, so it reports SMS status as `unknown` unless submission fails. One pending alert is persisted and retried; further impacts while it is pending are not queued.
- The default impact threshold is uncalibrated. Do not use the firmware as a certified safety device; characterize false positives/negatives on a safe test fixture before field trials.
- The app does not yet provide helmet pairing or account recovery. Anonymous data belongs to one app installation.
- Run the app on a development build and test with a real Firebase project and a provisioned device before treating push or telemetry as production-ready.
