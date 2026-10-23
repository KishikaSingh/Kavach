# Kavach Cloud Migration & Architecture Notes: Transition to Supabase

*Authoritative architectural record detailing the transition from Firebase Realtime Database to Supabase PostgreSQL, schema normalization, and Realtime WebSocket pipelines.*

---

## Table of Contents

- [Executive Migration Overview](#executive-migration-overview)
- [Relational Normalization & Entity Mapping](#relational-normalization--entity-mapping)
- [Accident Alert State Machine Lifecycle](#accident-alert-state-machine-lifecycle)
- [Row Level Security & Identity Governance](#row-level-security--identity-governance)
- [Client Service Layer Decoupling](#client-service-layer-decoupling)
- [Verification Evidence & Quality Metrics](#verification-evidence--quality-metrics)

---

## Executive Migration Overview

The **Kavach Smart Helmet** platform completed an architectural transition from Google Firebase Realtime Database (*NoSQL*) to **Supabase** (*PostgreSQL 15*). This evolution delivers:
- **Relational Integrity:** Foreign key constraints, unique triggers, and check constraints eliminating orphaned records.
- **Declarative Access Governance:** Native PostgreSQL Row Level Security (*RLS*) policies replacing custom proprietary security rules.
- **Atomic Lateral Views:** Consolidated single-query views (`v_latest_helmet_state`) synthesizing multi-table telemetry without client-side joins.
- **Enterprise SQL Automation:** Deterministic DDL migrations executing via automated Node.js runners (`scripts/apply-supabase-migration.mjs`).

---

## Relational Normalization & Entity Mapping

The legacy NoSQL hierarchical key-value structure was decomposed into normalized relational entities:

| Legacy NoSQL Document Path | Supabase PostgreSQL Table / View | Structural Classification | Transformation & Normalization Details |
| :--- | :--- | :--- | :--- |
| `devices/{deviceId}` | `helmets` + `helmet_telemetry` + `helmet_locations` | Relational + Time-Series | Separates static device registration from temporal sensor feeds and GPS track histories. |
| `devices/{deviceId}` (Latest State) | `v_latest_helmet_state` | Lateral Relational View | Aggregates the latest telemetry metrics and latest GPS coordinate fix into an atomic row. |
| `alerts/{deviceId}/{alertId}` | `accident_alerts` | Relational Table | Relational incident entity with impact severity, satellite lock precision, and resolution timestamps. |
| `users/{uid}/contacts/{contactId}` | `emergency_contacts` | Relational Table | E.164-normalized phone records with database-level single-primary contact trigger constraints. |
| `users/{uid}/settings` | `device_settings` | Relational Table | User notification preferences, push toggles, sound switches, and immutable hardware thresholds. |
| `users/{uid}/notifications/{id}` | `in_app_notifications` | Relational Table | Relational inbox records for rider notifications and maintenance dispatches. |
| `users/{uid}/pushTokens/{tokenId}` | `push_tokens` | Relational Table | Remote push notification device tokens mapped to platform architectures (*Android / iOS*). |
| `smsDispatches/{deviceId}/{alertId}` | `sms_delivery_logs` | Audit Log Table | Immutable audit trail for cellular modem and external gateway SMS transmissions. |

---

## Accident Alert State Machine Lifecycle

The incident lifecycle guarantees state consistency between cloud records, hardware modems, and client applications:

```text
[ Impact Kinematic Detection ]
             |
             v
         [ new ] --------------> (Inserted into accident_alerts; Realtime emits event)
             |
             +-----------------> [ pending ] (Cellular SMS transmission in transit)
             |                      |
             |                      +---> [ confirmed ] / [ simulated ] (Delivery confirmed)
             |                      |
             |                      +---> [ failed ] (Modem or gateway delivery fault)
             v
      [ resolved ] ------------> (Rider or authority confirms safety in application)
```

- **Idempotency Guarantee:** Incidents possess unique compound keys preventing duplicate alerts during sustained vibrations.
- **Audit Persistence:** Incident resolution updates `resolved_at` and `resolved_by`, persisting an audit entry into `in_app_notifications`.

---

## Row Level Security & Identity Governance

1. **Client Boundary Isolation:** The Expo application consumes strictly the public Supabase URL and the anonymous publishable key (`anon`). The privileged `service_role` secret is never bundled into mobile client distributions.
2. **Declarative User Isolation:** Row Level Security policies enforce that authenticated riders can only inspect and mutate their own profile, emergency contacts, device settings, and assigned hardware units.
3. **Demo Device Access:** Unassigned demo devices (`owner_id IS NULL`) remain readable by client applications in evaluation modes without requiring manual account registration.

---

## Client Service Layer Decoupling

The mobile client architecture isolates visual screens from database SDK bindings:
- Screens consume unified hooks (`useDevice`, `useAlerts`, `useContacts`, `useNotifications`, `useSettings`).
- The reactive data adapter (`src/services/liveAdapter.js`) routes requests to `src/services/supabaseService.js` in live mode, or `src/services/demoStore.js` in simulation mode.
- Switching between production cloud infrastructure and offline simulation requires only toggling `EXPO_PUBLIC_DATA_SOURCE` in the repository root `.env`.

---

## Verification Evidence & Quality Metrics

The Supabase implementation is validated through automated test suites:

- **Supabase Contract Suite (`live-supabase.test.js`):** Validates device telemetry ingestion, alert resolution, contact CRUD, notification inbox management, and Realtime multiplexing.
- **Regression Suite:** Guarantees zero crashes on `null` or unpopulated settings fields.
- **100% Passing Benchmark:** All 93 automated tests report passing status (`npm test`), with zero ESLint warnings or errors (`npm run lint`).
