# Integration notes (Person 3)

Merged: Person 1 shell (feat/shell-ui) + Person 2 screens/Firebase (feat/screens-backend) + Person 3 data layer.

Changes made to make them fit:
- Hooks (src/hooks/use*.js): added `export default` next to the named export, so Person 1's default imports and Person 2's named imports both work. Person 1's temp stubs (tempMock/tempStore + stub hooks) are removed.
- Person 2 screens (Location, Alerts, AlertDetails, Contacts, ContactForm): added `export default` so AppNavigator needs no change.
- utils/formatTime.js and utils/deviceStatus.js: union of Person 1 helpers (timeAgo, isOlderThan, hasValidCoords, getGpsState, GPS_LABELS, smsLabel...) and Person 3 helpers (relativeTime, ageMs, deriveDevice).
- services/liveAdapter.js: getLiveBackend() now returns Person 2's firebaseService.js.
- ALERT PATH FIX (needs Person 2's OK): firmware writes /alerts/{deviceId}/{alertId}. firebaseService.js now reads/writes `alerts/${DEVICE_ID}`, database.rules.json has alerts/$deviceId/$alertId, and the Cloud Function trigger is /alerts/{deviceId}/{alertId}.
- package.json: added firebase, expo-notifications, expo-device. .gitignore: .env.

Open items:
- notificationService.initPushNotifications() is not called anywhere yet (Person 1 App.js / Person 2).
- Rules are fully open (.write: true). Fine for the demo, lock down before real use.
- contacts/notifications/settings are flat (no per-user path) in Person 2's service.
