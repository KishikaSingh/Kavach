# Kavach Technical Demonstration & Presentation Guide

*Authoritative demonstration protocols and scripted presentation walkthroughs for the Kavach Smart Helmet ecosystem.*

---

## Table of Contents

- [Demonstration Philosophy & Strategy](#demonstration-philosophy--strategy)
- [Protocol A: Hardware-Free Interactive Demo Mode](#protocol-a-hardware-free-interactive-demo-mode)
- [Protocol B: Live Production Hardware Demo](#protocol-b-live-production-hardware-demo)
- [Key Architectural Talking Points](#key-architectural-talking-points)
- [Contingency Plans & Fault Recovery](#contingency-plans--fault-recovery)

---

## Demonstration Philosophy & Strategy

When presenting Kavach to evaluators, technical review boards, or academic panels, structure the presentation around two complementary protocols:

1. **Start with Protocol A (Interactive Demo Simulation):** Completely autonomous, zero external dependencies, zero hardware risk, and 100% predictable. Demonstrates full UI depth, reactive state management, and all 10 simulation scenarios.
2. **Conclude with Protocol B (Live Hardware Demonstration):** Performed if physical ESP32 hardware and cellular connectivity are available. Demonstrates physical impact detection, direct GSM SMS transmission, and sub-second cloud synchronization.

---

## Protocol A: Hardware-Free Interactive Demo Mode

*Execution Target: Expo Go or Android APK running with `EXPO_PUBLIC_DATA_SOURCE=demo`.*

### Step 1: Baseline Dashboard Overview (*Duration: ~30 seconds*)
- Open the application. Note the clean **Dashboard** showing the simulated helmet state: `Connected`, battery level at `85%`, GPS fix `Available`, and last telemetry update timestamp.
- **Presenter Narrative:** *"Kavach maintains strict geospatial truth. When telemetry is active and satellite fix is valid, real coordinates and map markers are presented. If a sensor fails or data is missing, the system explicitly reports unavailable rather than fabricating placeholder data."*

### Step 2: Emergency Contact Management (*Duration: ~30 seconds*)
- Navigate to the **Contacts** tab.
- Demonstrate adding an emergency contact with a valid 10-digit number.
- Attempt to add an identical number to demonstrate duplicate contact validation and rejection.
- Designate a contact as **Primary**.
- **Presenter Narrative:** *"Emergency contacts are normalized to international E.164 standards. The dispatch pipeline automatically prioritizes the primary contact during vehicular trauma."*

### Step 3: Triggering an Incident & Alert Resolution (*Duration: ~45 seconds*)
- Open the **Demo Drawer** (positioned via the bottom control banner) and tap **New accident alert**.
- Observe the immediate state transformation:
  - Dashboard banner shifts to a high-contrast critical alert state.
  - An emergency alert item populates in the **Alerts** tab.
  - An in-app notification is registered.
- Open the active alert in **Alert Details**:
  - Show impact severity rating (*High-G Impact*).
  - Show satellite coordinates and embedded Google Maps link.
  - Point out that inspecting the alert does not automatically resolve it.
- Tap **Mark as resolved**:
  - The incident status transitions to resolved.
  - The helmet returns immediately to healthy normal status.

### Step 4: Scenario Fault Injections (*Duration: ~45 seconds*)
- In the Demo Drawer, select **GPS unavailable**:
  - Open the **Location** tab: the map marker vanishes, and coordinates clearly state unavailable.
- In the Demo Drawer, select **Helmet offline**:
  - Dashboard indicates the device has severed connection, displaying the exact timestamp of the last known heartbeat.
- Select **Reset State** to conclude Protocol A with the system returned to standard baseline.

---

## Protocol B: Live Production Hardware Demo

*Execution Target: Physical ESP32 helmet unit communicating with the live Supabase cloud backend.*

### Pre-Demonstration Checklist
1. Ensure the repository root `.env` contains valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Ensure the mobile application is running with `EXPO_PUBLIC_DATA_SOURCE=live`.
3. Verify the ESP32 hardware is powered via an independent 2.0 A power source and connected to a 2.4 GHz mobile Wi-Fi hotspot.
4. Verify the SIM card has an active plan and GSM network registration.
5. Configure `SMS_RECIPIENT_E164` in `firmware/KavachHelmet/config.h` to the presenter's mobile handset.

### Live Demonstration Sequence
1. **Live Heartbeat Observation:** Show the mobile Dashboard updating periodically (*every 10 seconds*) as the real ESP32 transmits telemetry packets to Supabase.
2. **Controlled Physical Impact:** Firmly and carefully tap the helmet jig against the bench fixture.
3. **Hardware Dispatch Verification:**
   - Observe the hardware serial monitor log confirming impact vector exceeds threshold.
   - The SIM800L modem issues direct `AT+CMGS` commands.
   - The mobile handset receives an emergency SMS with live GPS coordinates.
4. **Cloud Synchronization Verification:**
   - The mobile application instantly captures the incident over Supabase Realtime WebSockets.
   - The active incident appears in the **Alerts** tab.
5. **Resolution:** Tap **Mark as resolved** in the mobile app to complete the lifecycle.

---

## Key Architectural Talking Points

- **Dual-Channel Resilience:** *"If mobile data networks fail or the rider's phone battery dies, the helmet's independent GSM cellular module guarantees out-of-band SMS delivery directly to family contacts."*
- **Incident Confidence Gate:** *"Kavach does not cry wolf. Kinematic vectors are evaluated against normalized confidence algorithms, preventing minor drops or road potholes from triggering emergency panic."*
- **Enterprise Cloud Security:** *"All database transactions are shielded by PostgreSQL Row Level Security. Telemetry streams are cryptographically authenticated and isolated per device owner."*

---

## Contingency Plans & Fault Recovery

- **If Wi-Fi drops during live hardware demo:** Fall back immediately to Protocol A. Explain that Protocol A utilizes the exact same React Native client and UI components that run in production live mode.
- **If GPS satellite lock is delayed indoors:** Highlight this as an intentional safety feature: point out that the system correctly reports satellite searching rather than hallucinating false coordinates.
- **If transient test alerts clutter the database:** Execute `\i supabase/reset.sql` in the Supabase SQL Editor to restore baseline demo conditions in 2 seconds.
