# Kavach Hardware-Free Testing & Simulation Manual

*Engineering guide to the zero-dependency in-memory simulation engine and hardware-free test automation pipelines.*

---

## Table of Contents

- [Architectural Scope & Objectives](#architectural-scope--objectives)
- [Activating Hardware-Free Demo Mode](#activating-hardware-free-demo-mode)
- [Interactive Scenario Catalog](#interactive-scenario-catalog)
- [Granular Telemetry Mutation Controls](#granular-telemetry-mutation-controls)
- [Simulated Collision Triggering & Safety Assertions](#simulated-collision-triggering--safety-assertions)
- [Automated Verification & Regression Suites](#automated-verification--regression-suites)
- [State Reset & Cleanup Procedures](#state-reset--cleanup-procedures)

---

## Architectural Scope & Objectives

The **Kavach Hardware-Free Simulation Engine** decouples mobile client development and technical validation from physical embedded microcontrollers, cellular modems, and active cloud subscriptions.

By implementing an in-memory reactive state machine adhering to the exact contracts of the live backend, developers and reviewers can:
- Exercise all visual widgets and user flows without physical sensor jigs.
- Simulate edge-case fault conditions (*satellite loss, low battery brownouts, sensor bus faults*) on demand.
- Guarantee that simulated accidents never dispatch external cellular SMS messages or bill live cloud infrastructure.

---

## Activating Hardware-Free Demo Mode

Hardware-free simulation is controlled via the centralized environment configuration:

1. In the repository root `.env` file (copied from `.env.example`):
   ```properties
   EXPO_PUBLIC_DATA_SOURCE=demo
   ```
2. Start the Expo development server:
   ```bash
   cd frontend
   npx expo start -c
   ```
3. The mobile application boots directly into simulation mode, rendering an interactive **DEMO MODE** control drawer.

---

## Interactive Scenario Catalog

The simulation engine implements **10 distinct hardware and network scenarios** accessible via the in-app Demo Drawer:

1. **`normal` (Nominal Cruising):**
   - Helmet link: `connected`
   - Incident status: `normal`
   - Battery: `85%` healthy
   - Satellite fix: `gpsValid = true` with live ground speed
   - Sensor health: IMU `ok`, GSM `registered`
2. **`newAlert` (High-G Vehicular Collision):**
   - Transitions accident status to `alert`.
   - Generates an active emergency alert item with severe impact kinematics.
   - Dispatches in-app notifications and surfaces the emergency dispatch banner.
3. **`gpsUnavailable` (Zero Satellite Visibility):**
   - Simulates riding through deep tunnels or underground parking structures.
   - Coordinates assert `null`; map marker is hidden; coordinates state unavailable.
4. **`gpsStale` (Satellite Cache Expiration):**
   - Satellite lock exists but fix timestamp is older than 5 minutes.
   - Evaluates client staleness indicators and map marker dimming.
5. **`offline` (Link Severed / Helmet Unreachable):**
   - Simulates power loss or complete RF shielding exceeding the 30-second heartbeat window.
   - Dashboard status transitions to `disconnected`, preserving the last known telemetry fix.
6. **`sensorFault` (MPU6050 Bus Failure):**
   - I2C communication with the inertial motion unit drops.
   - Dashboard displays hardware diagnostic warnings.
7. **`gsmUnregistered` (Cellular Outage):**
   - Modem loses cellular tower registration.
   - UI reflects degraded standalone operation.
8. **`batterySupported` (Low Battery Critical Alert):**
   - Battery level drops to `15%`.
   - Triggers low-voltage warning banners and visual indicators.
9. **`emptyDevice` (Unpaired Hardware Initial State):**
   - Simulates a freshly installed app before helmet association.
   - Validates that UI gracefully handles empty hardware states without throwing runtime exceptions.
10. **`reset` (Baseline Restoration):**
    - Clears all simulated incidents and restores healthy nominal Cruising state.

---

## Granular Telemetry Mutation Controls

In addition to canned scenarios, the Demo Drawer provides granular controls for runtime mutation:

- **Battery State:** Toggle between unsupported sensor (`null`), critical charge (`15%`), and healthy charge (`85%`).
- **Connection Health:** Toggle the ESP32 wireless link between active `Connected` and simulated `Offline`.
- **GPS Satellite Status:** Toggle between active fix (`Available`), satellite acquisition (`Searching`), expired cache (`Stale`), or complete loss (`No Fix`).
- **Subsystem Sensors:** Toggle simulated MPU6050 hardware diagnostic flags and cellular GSM registration states.

---

## Simulated Collision Triggering & Safety Assertions

To trigger a high-G collision event during simulation:

1. Tap **Trigger Accident** inside the Demo Drawer.
2. The simulation engine constructs an incident payload matching the production contract:
   - `alertId`: Unique simulation identifier.
   - `severity`: `"high"` (calibrated impact vector).
   - `latitude` / `longitude`: Bangalore baseline coordinates.
   - `status`: `"new"`.
3. **Safety Guarantee:** The client-side SMS gateway detects demo mode and sets the delivery status to `demo_sent`. Real cellular AT commands and external HTTP webhook requests are strictly blocked.

---

## Automated Verification & Regression Suites

The hardware-free simulation engine is guarded by automated test suites executed via `npm test`:

- **`hardware-free-workflow.test.js`**: Systematically evaluates every scenario state transition, telemetry control mutation, and subscription reactivity.
- **`demo-data-layer.test.js`**: Validates in-memory storage, contact deduplication, and notification indexing.
- **`device-settings.test.js`**: Asserts that visual widgets never crash when encountering unpopulated or `null` simulated settings.

---

## State Reset & Cleanup Procedures

To clear all simulated alerts, reset emergency contacts, and restore the default state:

- Tap **Reset All** within the in-app Demo Drawer.
- Alternatively, clear application cache in Expo Go by reloading the bundle (`r` key in Metro terminal).
