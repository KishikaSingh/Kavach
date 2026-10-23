# Kavach Hardware Bring-up & Commissioning Manual

*Systematic bench-testing checklist and electrical validation procedures for the `firmware/KavachHelmet` reference implementation.*

---

## Table of Contents

- [Safety Protocols & Bench Guidelines](#safety-protocols--bench-guidelines)
- [Electrical & Power Validation](#electrical--power-validation)
- [Compilation & Initial Flashing](#compilation--initial-flashing)
- [Subsystem Diagnostic Checklist](#subsystem-diagnostic-checklist)
- [GPS Satellite Fix Acquisition](#gps-satellite-fix-acquisition)
- [Cellular Network Commissioning & SMS Verification](#cellular-network-commissioning--sms-verification)
- [Kinematic Threshold Characterization](#kinematic-threshold-characterization)
- [Troubleshooting & Fault Isolation](#troubleshooting--fault-isolation)

---

## Safety Protocols & Bench Guidelines

*Execute all procedures strictly on an isolated electronics workbench. Never conduct impact or threshold testing with the helmet worn by a human subject.*

1. **Bench Isolation:** Fasten the helmet or sensor jig securely to a controlled mechanical test fixture.
2. **Dedicated Destination Number:** Configure `SMS_RECIPIENT_E164` to your own mobile handset during commissioning to avoid triggering false alarms to external emergency services.
3. **Common Ground Continuity:** Ensure low-impedance ground bonding across all modules before applying main power rails.

---

## Electrical & Power Validation

*Power rail instability causes over 90 percent of microcontroller resets during cellular modem registration.*

1. **Cellular Supply Rail:** Provide a dedicated **3.7 V to 4.2 V / 2.0 A peak** DC supply rail to the cellular modem (SIM800L / SIM900A). The ESP32 3.3 V on-board LDO regulator must never be used to drive the modem.
2. **Filtering Capacitance:** Solder a **1000 uF / 16 V low-ESR capacitor** directly across the cellular module power pins to buffer high-current GSM burst transmissions.
3. **Logic Level Integrity:** Verify that the modem UART signals do not exceed 3.3 V. Use a resistive voltage divider (*1 kOhm / 2 kOhm*) or bidirectional level shifter on the modem transmit line into the ESP32.

---

## Compilation & Initial Flashing

1. **Environment Setup:** Launch Arduino IDE or PlatformIO configured with the **Espressif ESP32** platform.
2. **Required Libraries:**
   - `Adafruit MPU6050`
   - `Adafruit Unified Sensor`
   - `TinyGPSPlus`
   - `ArduinoJson` (v7.x)
3. **Local Configuration:**
   - Copy `firmware/KavachHelmet/config.example.h` to `firmware/KavachHelmet/config.h`.
   - Configure local 2.4 GHz Wi-Fi credentials (`WIFI_SSID`, `WIFI_PASSWORD`).
   - Define `DEVICE_ID` matching the root `.env` configuration (*default: `HELMET_001`*).
   - Enter your personal mobile number as `SMS_RECIPIENT_E164`.
4. **Target Board Selection:** Select **ESP32 Dev Module**, verify compile clean, and flash over USB at **115200 baud**.

---

## Subsystem Diagnostic Checklist

Connect the Serial Monitor at **115200 baud** and verify each milestone:

| Inspection Milestone | Expected Serial Diagnostic Output | Corrective Action Upon Failure |
| :--- | :--- | :--- |
| **Microcontroller Boot** | `Kavach ESP32 reference firmware starting.` | Verify USB cable, COM port, and supply voltage. |
| **I2C Motion Bus** | Absence of `MPU6050 not detected on I2C.` | Inspect SDA (GPIO 21), SCL (GPIO 22), 3.3 V power rail. |
| **Wi-Fi Associated** | `Wi-Fi connected: <ip_address>` | Verify 2.4 GHz band (5 GHz unsupported), SSID, password. |
| **NTP Synchronization**| Absence of `NTP time sync failed` | Check internet gateway and UDP port 123 access. |
| **Telemetry Periodic** | `Telemetry sent; impact x.xx g, GPS ..., GSM ...` | Inspect network route to cloud API endpoint. |

---

## GPS Satellite Fix Acquisition

1. **Antenna Orientation:** Position the active ceramic patch antenna horizontally with an unobstructed view of the open sky.
2. **Cold Fix Latency:** Initial ephemeris download (*cold start*) may require between 2 and 5 minutes.
3. **Fix Assertion:**
   - When searching: Serial output indicates `GPS searching`, and telemetry payloads transmit `gpsValid = false` with `null` coordinates.
   - When locked: Serial output confirms `GPS valid`, reporting latitude, longitude, and ground speed.
   - Database Verification: Query `v_latest_helmet_state` to verify satellite fix coordinates propagate to the cloud database.

---

## Cellular Network Commissioning & SMS Verification

1. **SIM Card Preparation:** Ensure an active 2G-compatible nano-SIM is inserted with sufficient SMS messaging quota and the PIN lock disabled.
2. **Registration Verification:** Serial log must assert `SIM network registration: registered`. If output indicates `not registered`, verify antenna attachment, carrier 2G availability, and supply voltage headroom.
3. **Emergency Trigger Test:** Induce a firm, controlled tap on the test fixture exceeding calibrated impact thresholds.
4. **Verification Criteria:**
   - Confirm serial output logs `Emergency alert generated`.
   - Confirm hardware serial outputs `AT+CMGS` commands.
   - Confirm emergency SMS arrives on the designated mobile handset with an embedded Google Maps URL (`https://www.google.com/maps?q=lat,lng`).

---

## Kinematic Threshold Characterization

The default firmware constants are defined at the head of `KavachHelmet.ino`:
- `WARNING_THRESHOLD_G = 1.8`
- `IMPACT_THRESHOLD_G = 3.0`
- `ALERT_COOLDOWN_MS = 60000`

### Empirical Calibration Workflow

1. Mount the sensor assembly to the helmet shell.
2. Enable peak acceleration logging in serial diagnostics.
3. Subject the helmet to standard benign handling (picking up, setting down, normal head movement, minor road bumps) and log peak acceleration.
4. Subject the helmet fixture to controlled impact forces simulating vehicular trauma.
5. Set `IMPACT_THRESHOLD_G` safely above the maximum benign acceleration profile with an appropriate statistical safety margin.

---

## Troubleshooting & Fault Isolation

- **Issue: ESP32 restarts immediately when an impact occurs.**
  *Cause:* Modem transmission causes a severe power brownout on the supply rail.
  *Remedy:* Upgrade the modem power supply to a minimum 2.0 A rating and ensure a 1000 uF capacitor is installed directly across the modem power terminals.
- **Issue: GPS coordinates always report null even when outdoors.**
  *Cause:* Inverted UART wiring or Baud rate mismatch.
  *Remedy:* Ensure NEO-6M TX connects to ESP32 RX2 (GPIO 16) and GPS RX connects to ESP32 TX2 (GPIO 17) at 9600 baud.
- **Issue: SMS transmission fails with modem error.**
  *Cause:* Missing SMS Center number or insufficient cellular credit.
  *Remedy:* Verify network registration using `AT+CREG?` and verify SMS center settings using `AT+CSCA?`.
