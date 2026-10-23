# Smart Helmet (Kavach)

Expo mobile app and **Supabase (PostgreSQL)** backend for a smart helmet accident-alert IoT system. The helmet detects an impact,
sends emergency coordinates, logs telemetry and alerts to Supabase; the app (React Native + Expo SDK 57,
Android first) displays real-time helmet status, live location, historical tracks, alerts, emergency contacts, and settings.

- **Expo app:** `frontend/`
- **Supabase migrations, RLS, and seed scripts:** `supabase/`
- **ESP32 reference firmware (Arduino IDE):** `firmware/KavachHelmet/`
- **Supabase setup & schema guide:** [`supabase/README.md`](supabase/README.md)

```text
Helmet (ESP32 + MPU6050 + NEO-6M GPS + SIM800/SIM900)
   |  Emergency SMS (direct GSM cellular network)
   |  Wi-Fi / Cellular HTTP -> Supabase REST / WebSocket:  v_latest_helmet_state / accident_alerts
   v
Supabase (PostgreSQL + Realtime + RLS + Auth)
   |
   +-- Realtime Channel emits postgres_changes to Mobile App
   |
   +-- Mobile App (React Native Expo) updates Dashboard, Location map, Alerts, Contacts
```

---

## 1. Quick Start (Hardware-Free Demo Mode)

No hardware is required to run and test the complete system for college project evaluations:

```bash
cd frontend
npm install
npx expo start -c
```

To run in Demo Mode:
Set `EXPO_PUBLIC_DATA_SOURCE=demo` in `frontend/.env.local`, then scan the QR code with Expo Go.
An interactive **Demo Mode** drawer allows switching the simulated helmet between 10 situations (e.g. *New accident alert*, *GPS unavailable*, *Helmet offline*, *Low battery*, *Sensor failure*).

---

## 2. Live Mode (Supabase Backend)

1. **Deploy Database Schema & Seed Data:**
   - In Supabase Dashboard -> **SQL Editor**:
     - Run `supabase/migrations/20261023_init_kavach_schema.sql` (Creates tables, RLS policies, views, triggers).
     - Run `supabase/seed.sql` (Seeds demo device `HELMET_001` and sample telemetry).
2. **Configure Frontend Environment:**
   In `frontend/.env.local`:
   ```properties
   EXPO_PUBLIC_DATA_SOURCE=live
   EXPO_PUBLIC_BACKEND=supabase
   EXPO_PUBLIC_DEVICE_ID=HELMET_001
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
   ```
3. **Start Expo App:**
   ```bash
   npx expo start -c
   ```

---

## 3. Run the Automated Tests

All test suites run in seconds without external network dependencies:

```bash
cd frontend
npm test             # App + data layer + Supabase contract + regression suite (93 tests passing)
npm run lint         # Expo ESLint verification (0 errors)
npx expo-doctor      # Expo SDK 57 project health check (21/21 passed)
```

### What `npm test` checks:
- **Supabase Contract:** Live device telemetry, alerts lifecycle (`new` -> `resolved`), contacts CRUD, in-app notifications, and device settings.
- **Hardware-Free Demo Mode:** 10 scenarios, simulated accident triggers, and duplicate suppression.
- **Null Safety & Resilience:** `DeviceSettingsScreen` and `DeviceHealthCard` safety with null/undefined settings and thresholds.
- **Theme System:** Light, Dark, and System palettes with WCAG-compliant contrast.
- **Static Integrity:** Route navigators, imports, package references, and git-secret safety.

---

## 4. Resetting Demo Data

To clear transient alerts and reset the demo helmet to a clean, fresh state:
- Run `supabase/reset.sql` in the Supabase SQL Editor.
- Or tap **Reset State** in the app's Demo Controls.

---

## 5. Security & Row Level Security (RLS)

- **Client Credentials:** Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are placed in the client app.
- **Row Level Security:** Enabled on all tables (`profiles`, `helmets`, `helmet_telemetry`, `helmet_locations`, `emergency_contacts`, `accident_alerts`, `device_settings`, `in_app_notifications`).
- **No Secret Keys:** Privileged service-role keys, database passwords, and AWS secrets are never bundled into the mobile app.
