# Kavach Cloud Backend: Supabase & PostgreSQL Infrastructure Manual

*Production database architecture, relational schemas, Row Level Security policies, and migration pipelines for the Kavach Smart Helmet ecosystem.*

---

## Table of Contents

- [Architectural Scope & Engine Specifications](#architectural-scope--engine-specifications)
- [Directory Layout & Artifact Map](#directory-layout--artifact-map)
- [Relational Schema & Entity-Relationship Model](#relational-schema--entity-relationship-model)
- [Consolidated Lateral View: `v_latest_helmet_state`](#consolidated-lateral-view-v_latest_helmet_state)
- [Row Level Security & Tenant Isolation](#row-level-security--tenant-isolation)
- [Deployment via Automated Migration Script](#deployment-via-automated-migration-script)
- [Manual Deployment via Supabase Dashboard](#manual-deployment-via-supabase-dashboard)
- [Supabase CLI Migration Commands](#supabase-cli-migration-commands)
- [State Reset & Telemetry Baseline Restoration](#state-reset--telemetry-baseline-restoration)

---

## Architectural Scope & Engine Specifications

The **Kavach Cloud Backend** is hosted on **Supabase**, utilizing an enterprise-grade **PostgreSQL 15** relational database engine. It acts as the central synchronization and storage backbone for incoming hardware telemetry, satellite geolocation histories, emergency incident states, and mobile client subscriptions.

Key operational characteristics include:
- **Sub-Second Realtime Synchronization:** Supabase Realtime multiplexes PostgreSQL table changes over persistent WebSocket channels directly into client mobile applications.
- **Strict Row Level Security (RLS):** All data access is governed by declarative SQL policies enforcing zero-trust user boundaries.
- **Zero-Latency State Views:** High-frequency dashboard queries execute against an optimized lateral view, combining device telemetry and GPS fixes into a single record.

---

## Directory Layout & Artifact Map

```text
supabase/
├── migrations/
│   └── 20261023_init_kavach_schema.sql  # DDL migration: schemas, indexes, RLS, triggers
├── seed.sql                              # Seed fixtures for hardware HELMET_001
├── reset.sql                             # Safe state baseline reset script
└── README.md                             # This authoritative backend manual
```

---

## Relational Schema & Entity-Relationship Model

The PostgreSQL database schema consists of nine core operational tables:

| Relational Table | Functional Responsibility | Primary Key | Foreign Key Constraints |
| :--- | :--- | :--- | :--- |
| **`profiles`** | Rider identities, names, contact numbers, and preferences | `id` (UUID) | `id REFERENCES auth.users(id)` |
| **`helmets`** | Provisioned hardware registry, serial numbers, hardware revisions | `id` (TEXT) | `owner_id REFERENCES auth.users(id)` |
| **`helmet_telemetry`** | High-frequency sensor log (battery, status, IMU health, GSM signal) | `id` (UUID) | `helmet_id REFERENCES helmets(id)` |
| **`helmet_locations`** | Geospatial log (latitude, longitude, speed, fix precision) | `id` (UUID) | `helmet_id REFERENCES helmets(id)` |
| **`emergency_contacts`** | Designated emergency contacts with E.164 normalization & priority | `id` (UUID) | `user_id REFERENCES auth.users(id)` |
| **`accident_alerts`** | Incident records with impact magnitude, confidence, and lifecycle | `id` (TEXT) | `helmet_id REFERENCES helmets(id)` |
| **`sms_delivery_logs`** | Complete audit trail for outgoing cellular and gateway dispatches | `id` (UUID) | `alert_id REFERENCES accident_alerts(id)` |
| **`device_settings`** | User-specific alert thresholds, push switches, and sound toggles | `id` (UUID) | `user_id REFERENCES auth.users(id)` |
| **`in_app_notifications`**| User-visible incident and maintenance inbox log | `id` (UUID) | `user_id REFERENCES auth.users(id)` |
| **`push_tokens`** | Expo push tokens for remote Android and iOS dispatch | `id` (UUID) | `user_id REFERENCES auth.users(id)` |

---

## Consolidated Lateral View: `v_latest_helmet_state`

To provide the mobile dashboard with instant status updates without requiring multi-table roundtrips, a specialized lateral-joined view is defined:

```sql
CREATE VIEW public.v_latest_helmet_state AS
SELECT
    h.id AS "deviceId",
    h.name AS "deviceName",
    h.owner_id AS "ownerId",
    t.battery_percentage AS "batteryLevel",
    COALESCE(t.helmet_status, 'disconnected') AS "helmetStatus",
    COALESCE(t.accident_status, 'normal') AS "accidentStatus",
    t.sensor_status AS "sensorStatus",
    t.gsm_status AS "gsmStatus",
    COALESCE(l.gps_valid, false) AS "gpsValid",
    l.latitude AS "latitude",
    l.longitude AS "longitude",
    l.speed AS "speed",
    l.recorded_at AS "gpsLastFixAt",
    COALESCE(
        GREATEST(t.recorded_at, l.recorded_at),
        h.updated_at,
        h.created_at
    ) AS "lastUpdated"
FROM public.helmets h
LEFT JOIN LATERAL (
    SELECT battery_percentage, helmet_status, accident_status, sensor_status, gsm_status, recorded_at
    FROM public.helmet_telemetry
    WHERE helmet_id = h.id
    ORDER BY recorded_at DESC
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT latitude, longitude, gps_valid, speed, recorded_at
    FROM public.helmet_locations
    WHERE helmet_id = h.id
    ORDER BY recorded_at DESC
    LIMIT 1
) l ON true;
```

---

## Row Level Security & Tenant Isolation

Row Level Security is enforced on **every table**:

- **`profiles`**: Authenticated riders read and update only their own profile record (`auth.uid() = id`).
- **`helmets`**: Riders access helmets assigned to their ownership (`owner_id = auth.uid()`) or unassigned demo devices (`owner_id IS NULL`).
- **`helmet_telemetry` & `helmet_locations`**: Readable only by the device owner or for unassigned demo devices.
- **`emergency_contacts`**: Scoped strictly to `auth.uid() = user_id`.
- **`accident_alerts`**: Visible to assigned device owners; resolving an incident requires device ownership.
- **`device_settings` & `in_app_notifications`**: Private to the authenticated user.

---

## Deployment via Automated Migration Script

The repository provides a single-command migration runner that dynamically reads the database connection string from the root `.env` file:

```bash
# Execute from repository root
node scripts/apply-supabase-migration.mjs
```

The script automatically:
1. Resolves `SUPABASE_DB_URL` from the repository root `.env`.
2. Connects over secure SSL to the remote PostgreSQL instance.
3. Applies `supabase/migrations/20261023_init_kavach_schema.sql`.
4. Executes `supabase/seed.sql` to register the baseline `HELMET_001` device.
5. Verifies public table structures and validates the `v_latest_helmet_state` view output.

---

## Manual Deployment via Supabase Dashboard

1. Log in to the [Supabase Web Console](https://supabase.com/dashboard) and navigate to your project.
2. Select the **SQL Editor** tab.
3. Open `supabase/migrations/20261023_init_kavach_schema.sql`, copy its entire content into the editor, and click **Run**.
4. Open `supabase/seed.sql`, paste into the editor, and click **Run** to generate the baseline hardware fixture.
5. In **Database -> Publications**, ensure `supabase_realtime` encompasses `helmets`, `helmet_telemetry`, `helmet_locations`, and `accident_alerts`.

---

## Supabase CLI Migration Commands

If using the official Supabase CLI:

```bash
# 1. Authenticate with the Supabase CLI
supabase login

# 2. Link local workspace to your cloud project reference
supabase link --project-ref your-project-id

# 3. Apply declarative database schema
supabase db push

# 4. Ingest seed fixtures
supabase db execute --file supabase/seed.sql
```

---

## State Reset & Telemetry Baseline Restoration

During technical presentations or academic evaluations, transient alerts and degraded mock telemetry can be cleared back to a pristine baseline state:

```sql
-- Execute in Supabase SQL Editor
\i supabase/reset.sql
```

This clears transient accident alerts while preserving registered user profiles, emergency contacts, and customized device preferences.
