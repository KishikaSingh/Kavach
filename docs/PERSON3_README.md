# Person 3 — Phase 1 data layer (demo mode)

Copy the `src/` folders from this package into the Expo project (they only add files; nothing here replaces Person 1's or Person 2's files). Everything runs in **demo mode** with no Firebase project and no hardware.

## For Persons 1 and 2: how to use it

```js
import { useDevice, useAlerts, useContacts, useNotifications, useSettings, useDemoControls } from '../hooks';

const { device, dataSource, backendReachable, loading, error, refresh } = useDevice();
```

| Hook | Returns |
| --- | --- |
| `useDevice()` | `{ device, dataSource, backendReachable, loading, error, refresh, refreshing, retry }` |
| `useAlerts()` | `{ alerts, activeAlerts, loading, error, refresh, refreshing, retry, resolveAlert(id) }` |
| `useContacts()` | `{ contacts, isConfigured, primaryContact, loading, error, retry, addContact, updateContact, deleteContact, setPrimary }` |
| `useNotifications()` | `{ notifications, unreadCount, loading, error, retry, markRead, markAllRead, clearAll }` |
| `useSettings()` | `{ settings, loading, error, retry, updateSettings }` |
| `useDemoControls()` | `{ isDemo, scenario, scenarios, setScenario(name) }` |

### Rules built into the data

- `device` is derived: `helmetStatus` becomes `"disconnected"` after 30 s without an update; `latitude`/`longitude` are `null` whenever `gpsValid` is false (never draw a marker then).
- Extra derived fields on `device`: `gpsStatus` (`available | searching | unavailable | stale`), `gpsAgeMs`, `lastCommunicationAgeMs`.
- `utils/mapLinks.js`: `hasValidCoordinates(device)` and `googleMapsUrl(lat, lng)` (returns `null` for unusable coordinates).
- `utils/formatTime.js`: `relativeTime(iso)`, `formatDateTime(iso)`.
- `utils/validators.js`: `normalizePhone`, `validateName` (E.164, +91 default). The contact actions already validate, so forms can just show `error.message`.
- Contact action errors are `ServiceError` with `.code`: `INVALID_NAME`, `INVALID_PHONE`, `DUPLICATE_PHONE`, `NOT_FOUND`.
- `resolveAlert(id)` only on an explicit button press. Viewing an alert never resolves it.
- `updateSettings({ accidentThreshold })` rejects with `UNSUPPORTED`: show "Unavailable" in the UI.
- Show the Demo badge whenever `dataSource === 'demo'`.
- Saving a contact does not change the helmet's SMS recipient.

### Demo scenarios (for testing every state)

`useDemoControls().setScenario(name)` with: `normal`, `newAlert`, `gpsUnavailable`, `gpsStale`, `offline`, `sensorFault`, `gsmUnregistered`, `backendUnreachable`, `batterySupported`, `emptyDevice`. Put a small hidden demo menu on Settings or Profile that calls it. In live mode `isDemo` is false: render no controls.

## For Person 2: connecting Firebase (Phase 3)

`src/services/liveAdapter.js` has the single hook-up point. When `firebaseService.js` exists, make `getLiveBackend()` return it. It must provide these functions (same names the services call):

```
subscribeDevice(onData, onError) -> unsubscribe     refreshDevice() -> Promise
subscribeApp(onData, onError) -> unsubscribe        (returns { dataSource: 'live', backendReachable })
subscribeAlerts(onData, onError) -> unsubscribe     resolveAlert(id) -> Promise
subscribeContacts(onData, onError) -> unsubscribe
addContact(c), updateContact(id, patch), deleteContact(id), setPrimary(id) -> Promise
subscribeNotifications(onData, onError) -> unsubscribe
markRead(id), markAllRead(), clearAll() -> Promise
subscribeSettings(onData, onError) -> unsubscribe   updateSettings(patch) -> Promise
```

Until then, `EXPO_PUBLIC_DATA_SOURCE=live` shows a clear `LIVE_NOT_CONNECTED` error instead of fake data. Note: the notification list lives in `services/inboxService.js` (not `notificationService.js`, which stays Person 2's push-permission file).

## Tests

Services, utils and scenarios were tested in Node (7 tests passing, including live mode refusing to fall back to fake data). The React hooks were syntax-checked but not rendered in a test, because the build sandbox could not reach the npm registry. Run the app and open each screen to confirm.
