# Kavach Smart Helmet: Firebase to Supabase Migration Notes

This document provides a technical overview and architectural mapping of the migration from Firebase to Supabase for the Kavach Smart Helmet college IoT project.

---

## 1. Architectural Summary

- **Primary Database:** Supabase PostgreSQL with Row Level Security (RLS) on all exposed tables.
- **Client Library:** `@supabase/supabase-js` (v2.x) with session persistence using `@react-native-async-storage/async-storage`.
- **Realtime Updates:** Supabase Realtime Channels subscribing to `postgres_changes` across `helmet_telemetry`, `helmet_locations`, `accident_alerts`, `emergency_contacts`, and `in_app_notifications`.
- **Clean Service Decoupling:** The application UI screens remain decoupled from the database SDK. The service layer (`src/services/liveAdapter.js`) delegates to `supabaseService.js`.
- **Hardware-Free Demo Mode:** Preserved with zero external dependencies via `demoStore.js` for seamless college project presentations.

---

## 2. Firebase to PostgreSQL Mapping

| Old Firebase Path | New PostgreSQL Table / View | Type | Schema Details & Field Transformations |
| :--- | :--- | :--- | :--- |
| `devices/{deviceId}` | `helmets` (registry) + `helmet_telemetry` + `helmet_locations` | Relational + Time-series | Normalizes device registration, time-series sensor readings, and GPS history. |
| `devices/{deviceId}` (Latest snapshot) | `v_latest_helmet_state` | Database View | Aggregates latest telemetry (`batteryLevel`, `helmetStatus`, `accidentStatus`) and location (`latitude`, `longitude`, `gpsValid`) into a single record. |
| `alerts/{deviceId}/{alertId}` | `accident_alerts` | Relational Table | `id` (PK), `helmet_id` (FK), `timestamp`, `severity`, `latitude`, `longitude`, `gps_valid`, `status`, `sms_status`, `resolved_at`, `resolved_by`. |
| `users/{uid}/contacts/{contactId}` | `emergency_contacts` | Relational Table | `id` (UUID PK), `user_id` (FK), `name`, `phone` (E.164), `is_primary` (BOOLEAN with single-primary trigger). |
| `users/{uid}/settings` | `device_settings` | Relational Table | `user_id` (UUID UNIQUE FK), `notifications_push`, `notifications_sound`, `accident_threshold` (immutable from client). |
| `users/{uid}/notifications/{id}` | `in_app_notifications` | Relational Table | `id` (UUID PK), `user_id` (FK), `type`, `title`, `body`, `read`, `alert_id`, `device_id`, `timestamp`. |
| `users/{uid}/pushTokens/{tokenId}` | `push_tokens` | Relational Table | `user_id` (FK), `token`, `platform` (`android` / `ios`), `updated_at`. |
| `smsDispatches/{deviceId}/{alertId}` | `sms_delivery_logs` | Audit Log Table | `id` (UUID PK), `alert_id` (FK), `recipient_phone`, `status` (`pending`, `confirmed`, `failed`, `simulated`), `provider`. |

---

## 3. Accident Alert Lifecycle

The accident alert lifecycle is modeled cleanly across both the database and mobile client:

```text
[ detected ] (Helmet impact sensor triggers alert)
      |
      v
  [ new ]    (Inserted into accident_alerts; Realtime channel emits event)
      |
      +---> [ pending ] (SMS dispatch requested or queued)
      |        |
      |        +---> [ confirmed ] / [ simulated ] (SMS delivered)
      |        |
      |        +---> [ failed ] (Modem or gateway delivery failure)
      v
[ acknowledged ] / [ resolved ] (User acknowledges & marks resolved in app)
```

- **Idempotency:** Each alert uses a stable identifier (`id`) preventing duplicate processing.
- **Audit Trail:** Every resolution updates `resolved_at` and `resolved_by`, and appends an entry to `in_app_notifications`.

---

## 4. Security & Row Level Security (RLS)

1. **No Sensitive Keys on Client:**
   - The Expo client only requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`anon` key).
   - The Supabase `service_role` secret is never packaged into the React Native bundle.
2. **Access Control:**
   - Authenticated users can only read and write their own contacts, notifications, settings, and owned helmets.
   - For demo evaluations, demo devices (`owner_id IS NULL`) can be read by clients without requiring hardcoded accounts.

---

## 5. Verification & Test Evidence

All 93 automated tests pass synchronously and offline:

- **Supabase Contract Suite (`tests/live-supabase.test.js`):**
  - Live device telemetry loading & streaming
  - Alerts subscription & resolution
  - Contacts CRUD with international phone validation and primary promotion
  - Notification inbox read/clear operations
  - Device settings null safety & threshold protection
  - Expo push token registration
- **Demo Mode Suite (`tests/hardware-free-workflow.test.js`):**
  - 10 simulation scenarios
  - Simulated accident triggers without real SMS
- **Static Integrity (`tests/static.test.js`):**
  - Relative imports, package declarations, and route navigators verified.
- **Expo Linter & Doctor:**
  - `npm run lint`: 0 errors
  - `npx expo-doctor`: 21/21 checks passed
