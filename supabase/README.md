# Kavach Smart Helmet — Supabase Backend Guide

This directory contains the database migrations, RLS policies, seed scripts, and configuration for running Kavach Smart Helmet on **Supabase** (PostgreSQL).

---

## 1. Directory Structure

```text
supabase/
├── migrations/
│   └── 20261023_init_kavach_schema.sql  # Normalized PostgreSQL schema, indexes, RLS, triggers
├── seed.sql                              # Seed data for demo helmet (HELMET_001), telemetry, GPS
├── reset.sql                             # Safe reset script to restore demo state
└── README.md                             # This guide
```

---

## 2. Table Schema Overview

| Table | Description | Primary Key | Foreign Keys / References |
| :--- | :--- | :--- | :--- |
| `profiles` | User profile details (rider name, email, phone) | `id` (UUID) | `id -> auth.users(id)` |
| `helmets` | Physical and simulated helmet device registry | `id` (TEXT, e.g. `HELMET_001`) | `owner_id -> auth.users(id)` |
| `helmet_telemetry` | Time-series sensor log (battery, connectivity, accident status) | `id` (UUID) | `helmet_id -> helmets(id)` |
| `helmet_locations` | Historical GPS coordinate logs | `id` (UUID) | `helmet_id -> helmets(id)` |
| `emergency_contacts` | Emergency contacts with phone validation and primary contact flag | `id` (UUID) | `user_id -> auth.users(id)` |
| `accident_alerts` | Accident event lifecycle (`new`, `pending`, `sent`, `resolved`) | `id` (TEXT) | `helmet_id -> helmets(id)`, `resolved_by -> auth.users(id)` |
| `sms_delivery_logs` | Audit trail for SMS dispatches (simulated or provider) | `id` (UUID) | `alert_id -> accident_alerts(id)` |
| `device_settings` | Notification preferences (push, sound) and detection threshold | `id` (UUID) | `user_id -> auth.users(id)` |
| `in_app_notifications`| Rider notification inbox for alerts and system updates | `id` (UUID) | `user_id -> auth.users(id)` |
| `push_tokens` | Expo push notification tokens for Android and iOS | `id` (UUID) | `user_id -> auth.users(id)` |

### Helper Views

- `v_latest_helmet_state`: Automatically aggregates the latest telemetry and GPS location for each registered helmet to provide fast, low-latency status queries to the mobile dashboard.

---

## 3. Row Level Security (RLS) Summary

RLS is enabled on **every** table:
- **`profiles`**: Authenticated users can only read and update their own record (`auth.uid() = id`).
- **`helmets`**: Users can view helmets they own or demo helmets where `owner_id IS NULL`.
- **`helmet_telemetry` & `helmet_locations`**: Readable only by the device owner or for unassigned demo devices.
- **`emergency_contacts`**: Strictly scoped to `auth.uid() = user_id`.
- **`accident_alerts`**: Visible to helmet owners; only helmet owners can resolve alerts (`status = 'resolved'`).
- **`device_settings`**: Users can read and update their own notification toggles.
- **`in_app_notifications`**: Private to the user.

---

## 4. Setup Instructions via Supabase Web Dashboard

If using the Supabase Cloud Web Dashboard (no CLI required):

1. Log into [Supabase Dashboard](https://supabase.com/dashboard) and select your project (`dcgybpninduaacnarytf`).
2. Go to the **SQL Editor** tab.
3. Open `supabase/migrations/20261023_init_kavach_schema.sql`, copy all contents, paste into the SQL Editor, and click **Run**.
4. Open `supabase/seed.sql`, paste into the SQL Editor, and click **Run** to seed `HELMET_001` and sample readings.
5. In **Authentication -> Providers**, ensure **Email** and/or **Anonymous Sign-In** are enabled.
6. In **Database -> Publications**, verify `supabase_realtime` includes the relevant tables (`helmets`, `helmet_telemetry`, `accident_alerts`, etc.).

---

## 5. Setup Instructions via Supabase CLI

```bash
# 1. Login to Supabase CLI
supabase login

# 2. Link your local project to the remote Supabase project
supabase link --project-ref dcgybpninduaacnarytf

# 3. Push schema migrations
supabase db push

# 4. Seed demo data
supabase db execute --file supabase/seed.sql
```

---

## 6. How to Safely Reset Demo Data

To clear transient test telemetry or accident alerts generated during a college presentation while preserving user accounts and settings:

```sql
-- Run supabase/reset.sql in SQL Editor
-- Clears test alerts, resets telemetry to healthy baseline (85%, connected, normal, Bangalore GPS)
\i supabase/reset.sql
```
