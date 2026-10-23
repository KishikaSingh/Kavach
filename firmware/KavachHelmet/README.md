# Kavach Reference Firmware: ESP32 Edge Telemetry Engine

*Production reference implementation for the ESP32 microcontroller, integrating high-G inertial collision sensing, satellite positioning, and autonomous dual-channel emergency dispatch.*

---

## Table of Contents

- [Executive Overview](#executive-overview)
- [Hardware Architecture & Pin Specifications](#hardware-architecture--pin-specifications)
- [Power Delivery & Electrical Integrity](#power-delivery--electrical-integrity)
- [Toolchain & Compilation Environment](#toolchain--compilation-environment)
- [Configuration & Environment Mapping](#configuration--environment-mapping)
- [Runtime Telemetry & State Ingestion](#runtime-telemetry--state-ingestion)
- [Collision Detection & Cooldown Dynamics](#collision-detection--cooldown-dynamics)
- [Dual-Channel Cellular & Network Failover](#dual-channel-cellular--network-failover)
- [Bench Testing & Bring-up Verification](#bench-testing--bring-up-verification)
- [Operational Constraints & Disclaimers](#operational-constraints--disclaimers)

---

## Executive Overview

The **Kavach Embedded Firmware** (`firmware/KavachHelmet/`) executes bare-metal on the Espressif ESP32 dual-core microprocessor. It continuously evaluates 6-axis inertial motion vectors, decodes temporal satellite positioning fixes, maintains cloud telemetry connectivity, and autonomous cellular emergency messaging.

The design philosophy emphasizes **resilient survivability**: even if cloud connectivity or Wi-Fi networks suffer total collapse upon vehicular impact, the edge microcontroller autonomously executes out-of-band GSM cellular dispatch to alert designated emergency contacts.

---

## Hardware Architecture & Pin Specifications

The edge architecture couples the ESP32 with dedicated hardware peripherals over dedicated I2C and hardware UART serial buses.

| Peripheral Component | Function / Subsystem | Pin Label | ESP32 GPIO Mapping | Bus Protocol & Electrical Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **MPU6050** | 6-Axis Accelerometer / Gyroscope | SDA | **GPIO 21** | I2C Data (*3.3 V Logic, 400 kHz Fast-Mode*) |
| **MPU6050** | 6-Axis Accelerometer / Gyroscope | SCL | **GPIO 22** | I2C Clock (*3.3 V Logic, 400 kHz Fast-Mode*) |
| **u-blox NEO-6M** | Geolocation Positioning | TX | **GPIO 16** | Hardware UART RX2 (*9600 Baud, 8N1*) |
| **u-blox NEO-6M** | Geolocation Positioning | RX | **GPIO 17** | Hardware UART TX2 (*9600 Baud, 8N1*) |
| **SIM800L / SIM900A**| Cellular GSM / GPRS Transceiver | TXD | **GPIO 26** | Hardware UART RX1 (*Standard AT Command Set*) |
| **SIM800L / SIM900A**| Cellular GSM / GPRS Transceiver | RXD | **GPIO 27** | Hardware UART TX1 (*Standard AT Command Set*) |
| **Common Ground** | Electrical Reference | GND | **GND** | Shared common ground plane across all rails |

---

## Power Delivery & Electrical Integrity

*Electrical power starvation is the primary source of transient modem resets.*

1. **Cellular Transmit Bursts:** The SIM800L / SIM900A cellular modem draws transient peak currents reaching up to **2.0 A** during 2G burst transmissions. Never power the modem directly from the ESP32 internal 3.3 V linear voltage regulator or unbuffered USB rails.
2. **Dedicated Voltage Rail:** Supply the cellular transceiver using an independent 3.7 V to 4.2 V high-current step-down buck regulator or a high-discharge lithium-ion cell capable of 2.0 A sustained surges.
3. **Decoupling Capacitance:** Position a **1000 uF low-ESR electrolytic capacitor** in parallel with a **0.1 uF ceramic capacitor** directly adjacent to the modem VCC and GND terminals.
4. **Logic Level Isolation:** Ensure all UART lines respect the 3.3 V input tolerance of the ESP32. If using a 5.0 V tolerant modem board, insert a bidirectional logic level shifter or calibrated voltage divider (*1 kOhm / 2 kOhm*) on the modem TXD to ESP32 RX line.

---

## Toolchain & Compilation Environment

1. **Integrated Development Environment:** Arduino IDE (*v2.0+*) or PlatformIO.
2. **Board Support Package:** Install the official **Espressif ESP32** platform via the Boards Manager.
3. **Required Library Dependencies:**
   - `Adafruit MPU6050` (*Sensor hardware abstraction*)
   - `Adafruit Unified Sensor` (*Core sensor driver interfaces*)
   - `TinyGPSPlus` (*NMEA-0183 stream parser*)
   - `ArduinoJson` (*Version 7.x schema-compliant JSON serialization*)

---

## Configuration & Environment Mapping

Per-device hardware configuration parameters must never be committed to source control.

1. Duplicate the template configuration file:
   ```bash
   cp firmware/KavachHelmet/config.example.h firmware/KavachHelmet/config.h
   ```
2. Populate the required parameters in `config.h`:
   - `WIFI_SSID` / `WIFI_PASSWORD`: 2.4 GHz local hotspot or staging access point.
   - `DEVICE_ID`: Unique alphanumeric hardware identity (*e.g., `HELMET_001`*). Must match `EXPO_PUBLIC_DEVICE_ID` defined in the repository root `.env`.
   - `SMS_RECIPIENT_E164`: Primary recipient phone number in international E.164 format (*e.g., `+919876543210`*).
   - Cloud Endpoint Parameters: Matching the deployed Supabase REST / WebSocket gateway.

*Note: `config.h` is strictly ignored by version control rules defined in `.gitignore`.*

---

## Runtime Telemetry & State Ingestion

Under baseline operation, the firmware executes a non-blocking 10-second telemetry polling loop:

- **Periodic State Ingestion:** Gathers battery status, sensor operational health, GSM signal registration, and satellite positioning.
- **Geospatial Integrity Gate:** Satellite fixes are strictly evaluated. Coordinates are transmitted only when `gps_valid = true` and the satellite fix timestamp is fresher than 10 seconds. In the absence of a lock, explicit `null` coordinates are recorded, preventing erroneous coordinate interpolation.
- **Contract Schema Alignment:** Outgoing payloads map precisely to the PostgreSQL schema and the consolidated database view `v_latest_helmet_state`.

---

## Collision Detection & Cooldown Dynamics

Impact detection evaluates composite linear deceleration vectors from the tri-axis accelerometer:

$$\text{Magnitude } G = \sqrt{a_x^2 + a_y^2 + a_z^2}$$

- **Warning Threshold:** Dynamic fluctuations exceeding **1.8 G** trigger internal transient warning flags.
- **Critical Impact Threshold:** Deceleration vectors exceeding **3.0 G** trigger immediate accident alert routines.
- **Debounce & Sampling Window:** Sustained deceleration across multiple consecutive sample frames distinguishes true vehicular trauma from incidental helmet handling.
- **Cooldown Invariant:** A strict 60-second cooldown window (`ALERT_COOLDOWN_MS = 60000`) prevents cascading duplicate alert creation during post-impact helmet rolling.

---

## Dual-Channel Cellular & Network Failover

Upon confirming a catastrophic impact event:

1. **Hardware GSM SMS Transmission:** The firmware prioritizes immediate out-of-band communication. It transmits AT command sequences (`AT+CMGS`) directly over hardware serial to send emergency coordinates and detection timestamps to `SMS_RECIPIENT_E164`.
2. **Delivery Status Qualification:** Cellular modem acknowledgments reflect network acceptance, not handset delivery confirmation. The firmware reports `smsStatus: "unknown"` rather than falsely claiming delivery, and reports `"failed"` if transmission cannot be completed.
3. **Cloud State Synchronization:** In parallel, the ESP32 commits an incident record (`accident_alerts`) to the cloud backend with status `new`, triggering automated cloud escalation.
4. **Persistent NVS Recovery:** A single pending uncommitted alert is preserved in non-volatile flash storage (*NVS*), surviving sudden power loss or MCU reboots.

---

## Bench Testing & Bring-up Verification

Follow this ordered sequence during hardware bench bring-up:

1. **Serial Diagnostic Stream:** Connect serial monitor at **115200 baud**. Verify the startup banner and successful hardware bus initializations.
2. **I2C Motion Check:** Ensure no `MPU6050 not detected` errors appear. Verify stationary gravity reads approximately `1.0 G`.
3. **GPS Antenna Exposure:** Position the NEO-6M receiver adjacent to an exterior window. A cold fix typically requires 2 to 5 minutes. Verify coordinates appear in the serial log.
4. **Cellular Signal Verification:** Confirm modem output asserts `SIM network registration: registered`.
5. **Controlled Impact Test:** Apply a firm, controlled manual tap to the bench fixture. Confirm that an emergency alert record is generated and serial output reflects SMS submission.

---

## Operational Constraints & Disclaimers

- **Evaluation Prototype:** This firmware is engineered as a reference prototype for academic, research, and technical evaluation. It is not a certified automotive safety device.
- **Threshold Calibration:** Deceleration thresholds must be rigorously calibrated on calibrated drop towers and impact test rigs before considering field deployments.
- **2G Network Availability:** The SIM800L / SIM900A series requires active 2G GSM cellular infrastructure. Verify carrier support within the operational region.
