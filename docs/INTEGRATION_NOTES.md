# Integration notes

The current repository is organized into `frontend/` (Expo app) and `backend/` (Firebase rules and Cloud Functions). The Person 2 implementation is connected to the shared hooks through `frontend/src/services/liveAdapter.js`.

## Person 2 integration

- Live Firebase uses persistent anonymous Authentication. Contacts, settings, notifications, and Expo push tokens are scoped to `users/{uid}`.
- Owner reads of helmet telemetry/alerts require an admin-provisioned `deviceOwners/{deviceId}/{uid}` entry. The device identity, authenticated with a custom `device_id` claim, can read only an exact alert record for retry recovery and can write its own device/alert data; `backend/functions/scripts/provision-device.js` creates the device identity and owner grant.
- The alert-created Cloud Function writes an in-app notification and sends an Expo push only for owners with push enabled. Expo tickets and delivery receipts are tracked; invalid device tokens are removed.
- Push response taps route to `AlertDetails`. Expo push setup requires an EAS project ID and native push credentials; see `backend/firebase/SETUP.md`.
- `backend/firebase/database.rules.json` denies unauthenticated and cross-user access. Admin SDK provisioning and Cloud Functions are the only writers to owner mappings, push receipts, and dispatch records.

## Remaining integration dependencies

- The Arduino IDE reference firmware for ESP32 + MPU6050 + SIM900A + NEO-6M is in `firmware/KavachHelmet/`. It matches the current device/alert schema and custom-claim provisioning flow, but remains prototype code until compiled and tested on the exact hardware, calibrated, and verified end-to-end.
- The reference firmware has a configurable fixed SMS recipient; it does not sync app contacts. SIM900A submission acceptance is not delivery confirmation, so it reports SMS status as `unknown` unless submission fails. One pending alert is persisted and retried; further impacts while it is pending are not queued.
- The default impact threshold is uncalibrated. Do not use the firmware as a certified safety device; characterize false positives/negatives on a safe test fixture before field trials.
- The app does not yet provide helmet pairing or account recovery. Anonymous data belongs to one app installation.
- Contacts saved in the app do not alter the helmet's SMS recipient.
- Run the app on a development build and test with a real Firebase project and a provisioned device before treating push or telemetry as production-ready.
