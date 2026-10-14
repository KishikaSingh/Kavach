# Integration notes

The current repository is organized into `frontend/` (Expo app) and `backend/` (Firebase rules and Cloud Functions). The Person 2 implementation is connected to the shared hooks through `frontend/src/services/liveAdapter.js`.

## Person 2 integration

- Live Firebase uses persistent anonymous Authentication. Contacts, settings, notifications, and Expo push tokens are scoped to `users/{uid}`.
- Helmet and alert reads require an admin-provisioned `deviceOwners/{deviceId}/{uid}` entry. Helmet writes require a custom Firebase Auth claim named `device_id`; `backend/functions/scripts/provision-device.js` creates the device identity and owner grant.
- The alert-created Cloud Function writes an in-app notification and sends an Expo push only for owners with push enabled. Expo tickets and delivery receipts are tracked; invalid device tokens are removed.
- Push response taps route to `AlertDetails`. Expo push setup requires an EAS project ID and native push credentials; see `backend/firebase/SETUP.md`.
- `backend/firebase/database.rules.json` denies unauthenticated and cross-user access. Admin SDK provisioning and Cloud Functions are the only writers to owner mappings, push receipts, and dispatch records.

## Remaining integration dependencies

- Person 3 must make ESP32 firmware authenticate with the provisioned custom token, exchange/store its refresh token safely, and write the existing device/alert paths. The firmware remains a Person 3 deliverable; this repository currently has no firmware directory.
- The app does not yet provide helmet pairing or account recovery. Anonymous data belongs to one app installation.
- Contacts saved in the app do not alter the helmet's SMS recipient. SMS delivery/status must come from firmware.
- Run the app on a development build and test with a real Firebase project and a provisioned device before treating push or telemetry as production-ready.
