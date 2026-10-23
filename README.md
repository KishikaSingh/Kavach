# Kavach: Intelligent IoT Safety & Incident Response System

*An enterprise-grade, life-critical IoT ecosystem uniting embedded telemetry, fault-tolerant edge hardware, Supabase cloud infrastructure, and an offline-capable React Native mobile client.*

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [System Architecture & Data Flow](#system-architecture--data-flow)
- [Hardware & Embedded Firmware](#hardware--embedded-firmware)
- [Cloud Infrastructure & Database Architecture](#cloud-infrastructure--database-architecture)
- [Mobile Client Architecture](#mobile-client-architecture)
- [Dual Operational Modes](#dual-operational-modes)
- [Accident Detection & Emergency Dispatch Matrix](#accident-detection--emergency-dispatch-matrix)
- [Environment Configuration](#environment-configuration)
- [Installation & Quick Start](#installation--quick-start)
- [Verification & Quality Assurance](#verification--quality-assurance)
- [Security Architecture & Access Control](#security-architecture--access-control)
- [Project Directory Structure](#project-directory-structure)
- [License & Attributions](#license--attributions)

---

## Executive Summary

**Kavach** (*Sanskrit for Armor or Shield*) is a mission-critical safety platform designed to eradicate the fatal latency window in two-wheeler vehicular emergencies. By combining precision inertial kinematics, low-latency satellite geolocation, autonomous dual-channel emergency dispatch, and real-time cloud synchronization, Kavach delivers continuous rider protection and instant post-collision response.

The platform coordinates three distinct engineering tiers:
1. **Embedded Edge Tier:** An ESP32-governed telemetry unit embedded inside the helmet, continuously sampling collision kinematics, satellite positioning, and cellular link viability.
2. **Cloud Tier:** A high-throughput **Supabase** backend backed by PostgreSQL, Row Level Security (*RLS*), real-time WebSocket multiplexing, and automated Edge Function dispatch.
3. **Mobile Client Tier:** An Android-first **React Native / Expo** mobile application engineered with resilient dual runtime modes (*Live Cloud* and *Zero-Dependency Demo Simulation*), providing live telemetry observation, route diagnostics, emergency contact management, and theme adaptability.

---

## System Architecture & Data Flow

Kavach employs an asymmetric, defense-in-depth messaging architecture. Telemetry and critical incidents are isolated into separate operational pipelines to guarantee emergency delivery even in degraded network conditions.

```text
+-----------------------------------------------------------------------------------+
|                           EMBEDDED HARDWARE HELMET                                |
|  ESP32 Microcontroller | MPU6050 6-Axis IMU | NEO-6M GPS Module | SIM800L Cellular|
+-----------------------------------------------------------------------------------+
          |                                                      |
   [Direct Cellular]                                      [Encrypted IP/WiFi]
   Autonomous GSM AT Pipeline                             HTTP POST / WebSocket Stream
          |                                                      |
          v                                                      v
+------------------------+                             +----------------------------+
| PRIMARY OUT-OF-BAND   |                             | SUPABASE CLOUD BACKEND     |
| EMERGENCY SMS DISPATCH |                             |                            |
| Hardware-level SMS to  |                             | - PostgreSQL 15 Relational |
| registered kin contact |                             | - Row Level Security (RLS) |
+------------------------+                             | - Realtime WebSockets      |
                                                       | - Edge Function Dispatch   |
                                                       +----------------------------+
                                                                     |
                                                              [Sub-second Stream]
                                                              Multiplexed Changes
                                                                     |
                                                                     v
                                                       +----------------------------+
                                                       | KAVACH MOBILE APPLICATION  |
                                                       | (React Native / Expo SDK)  |
                                                       |                            |
                                                       | - Telemetry Dashboard      |
                                                       | - Live Map Tracking        |
                                                       | - Incident Confidence Gate |
                                                       | - Failover SMS Gateway     |
                                                       +----------------------------+
```

### Incident Processing Pipeline

1. **Kinematic Anomaly Detection:** The embedded MPU6050 accelerometer and gyroscope registers high-G impact vectors exceeding calibrated deceleration thresholds.
2. **Channel 1 (Autonomous Edge Dispatch):** Without requiring smartphone pairing, the SIM800L modem issues direct GSM AT commands over cellular signaling channels to dispatch emergency SMS with raw coordinates.
3. **Channel 2 (Telemetry Ingestion):** In parallel, the ESP32 transmits structured telemetry payloads to Supabase over secure sockets or HTTPS.
4. **Automated View Synthesis:** PostgreSQL triggers aggregate incoming telemetry and location fixes into the materialized view `v_latest_helmet_state`.
5. **Real-time Mobile Propagation:** Subscribed mobile clients receive sub-second updates over Supabase Realtime channels.
6. **Incident Confidence Filtration:** The client-side incident engine computes a normalized confidence index (*0.00 to 1.00*). Events exceeding the configured confidence threshold trigger automated local escalation, emergency contact notification, and interactive routing.

---

## Hardware & Embedded Firmware

The embedded firmware located in `firmware/KavachHelmet/` is engineered for bare-metal execution on the Espressif ESP32 dual-core microprocessor architecture.

### Peripheral Bill of Materials (*BOM*)

- **Main Processor:** ESP32-WROOM-32 (*Dual-core Xtensa 32-bit LX6, 240 MHz, 520 KB SRAM*).
- **Kinematic Sensing:** InvenSense MPU6050 6-Axis MotionTracking device (*3-axis accelerometer, 3-axis gyroscope, calibrated I2C interface*).
- **Satellite Positioning:** u-blox NEO-6M GPS receiver (*UART interface at 9600 baud, NMEA-0183 protocol parsing via TinyGPS++*).
- **Cellular Telemetry:** SIMCom SIM800L / SIM900A GPRS/GSM quad-band transceiver (*Hardware UART, standard AT command set*).

### Firmware Characteristics

- **Collision Differentiation:** Differentiates between benign helmet drops, road vibrations, and severe collision dynamics via threshold vector summation.
- **GPS Fix Validation:** Validates coordinate precision, dilution of precision, and fix freshness before asserting `gps_valid = true`.
- **Fault-Tolerant State Machine:** Non-blocking asynchronous network retries prevent MCU stall during transient GSM registration drops.

---

## Cloud Infrastructure & Database Architecture

The backend infrastructure leverages **Supabase** (*PostgreSQL 15*) with declarative schema definitions and granular access boundaries.

### Schema Blueprint

- `helmets`: Registry of provisioned hardware units, serial numbers, hardware revisions, and assigned rider profiles.
- `helmet_telemetry`: High-frequency sensor ingestion containing battery percentages, helmet connectivity status, sensor status, and GSM signal flags.
- `helmet_locations`: Temporal geospatial coordinates (*latitude, longitude, speed, GPS validity flag, satellite fix timestamp*).
- `accident_alerts`: Incident records tracking impact magnitude, confidence level, alert lifecycle (*new*, *sent*, *resolved*), and SMS dispatch status.
- `emergency_contacts`: E.164-normalized emergency contact registry with primary priority ordering.
- `device_settings`: User configuration state encompassing notification preferences, incident thresholds, and safety toggles.
- `in_app_notifications`: Persistent incident log presented within the client application.
- `v_latest_helmet_state`: A consolidated lateral-joined relational view providing atomic single-row queries of current device telemetry, latest GPS fix, and compound freshness timestamps.

### Database Automation & Tooling

Database migrations and initial seeds are fully scripted:
- Schema Definition: `supabase/migrations/20261023_init_kavach_schema.sql`
- Seed Telemetry & Hardware Fixtures: `supabase/seed.sql`
- Automated Node.js Migration Runner: `scripts/apply-supabase-migration.mjs`

---

## Mobile Client Architecture

The mobile application residing in `frontend/` is constructed on **React Native** and **Expo SDK 57**, prioritizing performance, predictable state flow, and fault tolerance.

### Architectural Highlights

- **Shared State Layer:** Custom reactive hooks (`useDevice`, `useAlerts`, `useContacts`, `useNotifications`, `useSettings`, `useTheme`) abstract the transport protocol entirely. Components consume unified contracts independent of whether live Supabase or offline mock simulation is active.
- **Multiplexed Realtime Subscriptions:** Multiple concurrent listeners share a single Supabase Realtime channel instance, eliminating connection churn and memory exhaustion.
- **Adaptive Contrast Theme Engine:** Full light and dark mode implementations conforming to WCAG AA color ratios, preventing glare during nighttime riding while preserving high visibility under direct sunlight.
- **Resilient Component Tree:** Comprehensive null-safety guards across all visual widgets (`DeviceHealthCard`, `DeviceSettingsScreen`, `AlertDetailsScreen`), preventing application termination when fields are unpopulated or backends are initializing.

---

## Dual Operational Modes

Kavach supports two execution profiles selected via the unified environment configuration:

### 1. Zero-Dependency Hardware-Free Demo Mode

Configured with `EXPO_PUBLIC_DATA_SOURCE=demo`.

- Ideal for demonstrations, academic evaluations, UI testing, and rapid validation without physical ESP32 hardware or active cloud accounts.
- Features an integrated **Demo Control Drawer** providing immediate simulation of **10 comprehensive real-world scenarios**:
  1. *Normal Riding*: Healthy sensors, stable GPS, full battery, normal status.
  2. *Severe Impact Collision*: Automated accident alert trigger with full telemetry payload.
  3. *GPS Satellite Loss*: Degraded fix testing coordinate fallback routines.
  4. *Helmet Offline*: Link disconnect and heartbeat timeout simulation.
  5. *Critical Battery Depletion*: Low power threshold alerts and visual cues.
  6. *Sensor Bus Failure*: MPU6050 hardware diagnostic fault simulation.
  7. *GSM Network Drop*: Cellular transceiver disconnect scenario.
  8. *Rapid Impact Recovery*: False alarm cancellation and status reset.
  9. *Low-Confidence Bump*: Minor vibration event filtered by confidence gates.
  10. *Full System Reset*: Instant cleanup returning device state to baseline.

### 2. Production Live Mode

Configured with `EXPO_PUBLIC_DATA_SOURCE=live`.

- Connects directly to Supabase cloud infrastructure over authenticated WebSockets and HTTPS.
- Ingests real telemetry payloads from the physical helmet.
- Dispatches emergency notifications through integrated cloud or HTTP gateway providers.

---

## Accident Detection & Emergency Dispatch Matrix

To eliminate false alarms without compromising emergency response, Kavach uses a multi-tier confidence evaluation algorithm:

```text
Raw Impact Event -> Kinematic Analysis -> Normalized Confidence Score (0.00 - 1.00)
                                                    |
                      +-----------------------------+-----------------------------+
                      |                                                           |
           Confidence < Threshold                                      Confidence >= Threshold
           (e.g., minor drop, pothole)                                (e.g., high-speed collision)
                      |                                                           |
                      v                                                           v
            Suppressed / Logged Only                                     EMERGENCY ESCALATION
            No emergency contacts notified                              - Active Alert Record Created
                                                                        - Primary Contacts Selected
                                                                        - Deduplication Lock Claimed
                                                                        - Location URL Formatted
                                                                        - Dual SMS Gateway Triggered
                                                                        - In-App Dispatch Banner Shown
```

### Dispatch Safeguards

- **Confidence Thresholding:** Configurable threshold parameter (*default 0.60*) rejects minor jostles and benign dropped helmets.
- **Idempotent Deduplication:** Uses unique incident identifiers (`alertId`) to prevent spamming cellular networks during sustained vibration.
- **Geographic Fallback:** Valid GPS fixes append direct Google Maps coordinates (`https://www.google.com/maps?q=lat,lng`). Invalid fixes degrade gracefully with explicit telemetry notations instead of corrupting message payloads.
- **Delivery Integrity Audit:** The system logs dispatch status states (`sending`, `sent`, `demo_sent`, `unconfigured`, `failed`, `no_contacts`) and never falsely asserts delivery when gateways are unconfigured.

---

## Environment Configuration

Kavach enforces a **single source of truth** architecture. All configuration parameters reside strictly in the repository root `.env` file, with a committed template in `.env.example`.

### Root Template (`.env.example`)

```properties
# ==============================================================================
# KAVACH (SMART HELMET) — ENVIRONMENT CONFIGURATION TEMPLATE
# ==============================================================================
# Primary Backend: Supabase (Auth, PostgreSQL, Realtime, Edge Functions)
#
# Instructions:
#   1. Copy this file to `.env` in the repository root.
#   2. Fill in the values for your Supabase project.
#   3. Never commit `.env` containing real secrets to git.
#
# Client Note:
#   Variables prefixed with EXPO_PUBLIC_ are bundled into the client JS app.
#   Server secrets must NEVER use the EXPO_PUBLIC_ prefix.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. CORE SYSTEM & CLIENT RUNTIME
# ------------------------------------------------------------------------------
EXPO_PUBLIC_DATA_SOURCE=live
EXPO_PUBLIC_BACKEND=supabase
EXPO_PUBLIC_DEVICE_ID=HELMET_001

# ------------------------------------------------------------------------------
# 2. SUPABASE CONFIGURATION (PRIMARY BACKEND)
# ------------------------------------------------------------------------------
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

# Database Connection String for migration tooling
SUPABASE_DB_URL=postgresql://postgres:your-db-password@db.your-project-id.supabase.co:5432/postgres

# Optional: Dedicated demo user credentials for automatic login
EXPO_PUBLIC_SUPABASE_TEST_EMAIL=
EXPO_PUBLIC_SUPABASE_TEST_PASSWORD=

# ------------------------------------------------------------------------------
# 3. OPTIONAL CLIENT-SIDE SMS GATEWAY & EAS BUILD
# ------------------------------------------------------------------------------
EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL=
EXPO_PUBLIC_EMERGENCY_SMS_API_KEY=
EXPO_PUBLIC_EAS_PROJECT_ID=
```

*Note: Bundlers, migration scripts, and test harnesses automatically resolve `.env` from the repository root.*

---

## Installation & Quick Start

### Prerequisites

- **Node.js:** Version 18.0.0 or higher
- **npm:** Version 9.0.0 or higher
- **Expo Go:** Installed on an Android or iOS physical testing device (*or local emulator*)

### Step 1: Clone Repository & Initialize Environment

```bash
git clone https://github.com/KishikaSingh/Kavach.git
cd Kavach

# Copy the centralized configuration template
copy .env.example .env
```

### Step 2: Install Mobile Dependencies

```bash
cd frontend
npm install
```

### Step 3: Launch in Interactive Demo Mode

To evaluate the application instantly without external cloud setup:

1. Ensure `EXPO_PUBLIC_DATA_SOURCE=demo` is set in `.env`.
2. Start the development server:
   ```bash
   npx expo start -c
   ```
3. Scan the generated QR code using the **Expo Go** application on your device.
4. Open the **Demo Mode** drawer to trigger and observe live hardware scenarios.

### Step 4: Launch in Production Live Mode (*Supabase*)

1. Set `EXPO_PUBLIC_DATA_SOURCE=live` in `.env`.
2. Provide your valid `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_DB_URL`.
3. Apply the database schema and seed fixtures:
   ```bash
   # From repository root
   node scripts/apply-supabase-migration.mjs
   ```
4. Start the mobile app:
   ```bash
   cd frontend
   npx expo start -c
   ```

---

## Verification & Quality Assurance

The codebase includes an exhaustive automated verification suite validating data invariants, error boundaries, navigation routing, and contract parity.

```bash
cd frontend

# Execute test suite (93 tests covering app, contracts, and regressions)
npm test

# Verify code formatting and lint cleanliness (0 warnings, 0 errors)
npm run lint

# Validate Expo SDK dependency alignment and project health
npx expo-doctor
```

### Test Suite Coverage Scope

- **Contract Parity:** Invariant synchronization across firmware `config.h`, Supabase SQL schemas, and client state machines.
- **Hardware Simulation:** Deterministic progression of all 10 demo scenarios, telemetry controls, and simulated collision dispatches.
- **Resilience Under Fault:** Behavior under null settings, missing thresholds, disconnected backends, and malformed database views.
- **Safety Boundaries:** Validation that demo mode never dispatches real external SMS messages or leaks unauthenticated data.
- **Static Security Audit:** Verification that no private keys, database passwords, or unignored credential files are committed to version control.

---

## Security Architecture & Access Control

1. **Client Boundary Isolation:** Only the public Supabase URL and anonymous publishable key are exposed to the client bundle. Privileged service-role tokens and database connection strings are never embedded into mobile assets.
2. **PostgreSQL Row Level Security (*RLS*):** Enabled across all tables. Queries without valid identity claims or device ownership relationships are rejected at the database engine level.
3. **Secret Hygiene:** Repository `.gitignore` rules prevent `.env`, `.env.*`, native keystores, and certificate files from entering git history.

---

## Project Directory Structure

```text
Kavach/
├── .env                              # Single root source of environment configuration
├── .env.example                      # Central environment template
├── .gitignore                        # Enterprise-grade git ignore rules
├── README.md                         # Authoritative system documentation
├── package.json                      # Root workspace metadata
│
├── frontend/                         # Mobile application (React Native / Expo SDK 57)
│   ├── app.config.js                 # Dynamic Expo app configuration (reads root .env)
│   ├── metro.config.js               # Metro bundler resolver (reads root .env)
│   ├── package.json                  # Frontend dependencies and test scripts
│   ├── src/                          # Application source code
│   │   ├── components/               # Modular UI components (Health, Telemetry, Maps)
│   │   ├── navigation/               # React Navigation stacks and tab layouts
│   │   ├── screens/                  # Application views (Dashboard, Alerts, Settings)
│   │   ├── services/                 # Supabase client, SMS providers, notifications
│   │   └── theme/                    # Light, Dark, and Contrast theme definitions
│   └── tests/                        # Automated unit and integration test suite (93 tests)
│
├── supabase/                         # Cloud backend infrastructure
│   ├── migrations/                   # DDL migrations (tables, views, triggers, RLS)
│   ├── functions/                    # Supabase Edge Functions (incident dispatch)
│   └── seed.sql                      # Baseline hardware and telemetry fixtures
│
├── firmware/                         # Embedded hardware source code
│   └── KavachHelmet/                 # ESP32 Arduino firmware for MPU6050, GPS, GSM
│       ├── KavachHelmet.ino          # Core microcontroller runtime loop
│       ├── config.h                  # Per-device credentials (gitignored)
│       └── config.example.h          # Hardware configuration template
│
├── scripts/                          # Administrative and migration automation
│   └── apply-supabase-migration.mjs  # Direct PostgreSQL migration applicator
│
└── docs/                             # In-depth architectural references and guides
```

---

## License & Attributions

*Developed under the Kavach Smart Safety Initiative.*  
*Engineered for real-world reliability, rider security, and zero-latency emergency intervention.*
