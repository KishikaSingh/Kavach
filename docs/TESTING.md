# Kavach Automated Testing & Quality Assurance Manual

*Comprehensive test suite documentation, invariant validation procedures, and regression prevention benchmarks for the Kavach ecosystem.*

---

## Table of Contents

- [Testing Philosophy & Architecture](#testing-philosophy--architecture)
- [Execution Commands](#execution-commands)
- [Automated Test Suite Matrix](#automated-test-suite-matrix)
- [Hermetic Isolation & Stubs](#hermetic-isolation--stubs)
- [Coverage Scope & Invariant Verifications](#coverage-scope--invariant-verifications)
- [Pre-Deployment & Manual Acceptance Checklist](#pre-deployment--manual-acceptance-checklist)

---

## Testing Philosophy & Architecture

The Kavach testing architecture is engineered for **absolute repeatability and zero external network flakiness**. Every test executes locally in under 5 seconds using Node.js built-in test runner (`node:test`) and strict assertions (`node:assert/strict`).

Before execution, test files are bundled via **esbuild** into an isolated compilation target (`.test-build`), swapping native runtime modules (such as React Native UI elements and cloud client libraries) for memory-based in-memory fakes.

---

## Execution Commands

Execute test suites from the `frontend/` directory:

```bash
cd frontend

# Execute entire test suite (all 93 tests across 12 suites)
npm test

# Run a specific filtered test subset (e.g., only theme or navigation)
npm test -- theme
npm test -- navigation

# Execute Expo static linter (0 errors, 0 warnings)
npm run lint

# Validate Expo SDK health and dependency compatibility
npx expo-doctor
```

---

## Automated Test Suite Matrix

The automated verification suite comprises **93 unit, integration, invariant, and regression tests** distributed across 12 focused test suites:

| Test File | Total Checks | Primary Verification Scope |
| :--- | :--- | :--- |
| **`demo-data-layer.test.js`** | 6 Tests | Phone validation, scenario device derivation, duplicate contact rejection, alert lifecycle, and subscription cleanup. |
| **`device-settings.test.js`** | 11 Tests | Null-safety regression tests, initial loading states, missing threshold resiliency, and setting mutations. |
| **`emergency-notifications.test.js`** | 12 Tests | Incident confidence scoring, threshold gating, E.164 phone normalization, Google Maps link generation, duplicate suppression, and gateway fallbacks. |
| **`firmware-contract.test.js`** | 8 Tests | JSON schema parity between firmware payloads and database definitions, frozen vocabulary assertion, and GPS fix requirements. |
| **`hardware-free-workflow.test.js`** | 8 Tests | End-to-end evaluation of all 10 demo scenarios, telemetry controls, simulated collision events, and subscription reactivity. |
| **`hooks.test.js`** | 8 Tests | Data hook contracts (`useDevice`, `useAlerts`, `useContacts`, `useNotifications`, `useSettings`, `useDemoControls`), loading cycles, and named/default exports. |
| **`live-not-configured.test.js`** | 1 Test | Guarantees unconfigured live mode safely degrades to `LIVE_NOT_CONNECTED` without fabricating false telemetry. |
| **`live-supabase.test.js`** | 11 Tests | Supabase service integration: telemetry mapping, alert resolution, contact CRUD, in-app notification clearing, and Realtime channel multiplexing. |
| **`navigation.test.js`** | 4 Tests | Navigation route registration, deep links, tab layout integrity, and static audit verifying no undefined routes exist. |
| **`notification-architecture.test.js`**| 8 Tests | SMS provider selection, notification tap routing, push permission guards, in-app notification state management, and manual SMS fallbacks. |
| **`static.test.js`** | 9 Tests | Static repository analysis: relative import verification, `package.json` validation, firmware `DEVICE_ID` parity, root `.env.example` validation, and git-secret hygiene. |
| **`theme.test.js`** | 7 Tests | WCAG AA color contrast verification, semantic token presence across Light and Dark palettes, tone generation, and AsyncStorage theme persistence. |

---

## Hermetic Isolation & Stubs

The test harness (`frontend/tests/run.mjs`) injects dedicated stubs defined in `frontend/tests/fakes/`:

- `@supabase/supabase-js`: Fully functional in-memory PostgreSQL emulator supporting query filtering, record insertion, updating, and simulated Realtime subscriptions.
- `react-native`: Stand-in stubs for `Platform`, `StyleSheet`, and core React components.
- `@react-native-async-storage/async-storage`: In-memory key-value dictionary simulating mobile persistence.
- `expo-notifications`: Mock notification handler validating permission requests and notification listeners.

---

## Coverage Scope & Invariant Verifications

1. **Hardware-to-Cloud Invariant:** The `DEVICE_ID` defined in `firmware/KavachHelmet/config.example.h` must match the fallback identifier in `src/services/supabaseService.js` and the root `.env.example`.
2. **Geospatial Truth Invariant:** If GPS lock is absent (`gpsValid = false`), the system must never invent coordinates; latitude and longitude must remain strictly `null`.
3. **Emergency Escalation Invariant:** Impacts falling below the configured confidence threshold (*e.g., minor bumps*) are logged internally but must never trigger emergency contact dispatch.
4. **Zero-Secret Invariant:** No `.env` secrets, private keys, or credentials may reside in tracked git commits.

---

## Pre-Deployment & Manual Acceptance Checklist

Prior to staging demonstrations or issuing build artifacts:

### Demo Mode Verification
- [ ] Application launches cleanly into onboarding and Dashboard.
- [ ] Dashboard displays `DEMO MODE` indicator.
- [ ] Open Demo Drawer -> Select **New accident alert**: Banner turns critical red, and an incident alert appears in the Alerts tab.
- [ ] Tapping **Mark as resolved** safely closes the incident and restores standard operational status.
- [ ] Open Demo Drawer -> Select **GPS unavailable**: Map marker is hidden and coordinates report unavailable.

### Live Mode Verification
- [ ] Root `.env` contains valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Application launches without `LIVE_NOT_CONNECTED` warning.
- [ ] Modifying data in Supabase updates the mobile Dashboard within 1 second.
- [ ] Adding an emergency contact persists to the Supabase `emergency_contacts` table.
