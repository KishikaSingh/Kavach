# Kavach Firmware Architecture & Hardware Integration

*Comprehensive directory guide, embedded component taxonomy, pin configurations, and bench testing workflows for the Kavach Smart Helmet firmware suites.*

---

## Table of Contents

- [Firmware Suite Taxonomy](#firmware-suite-taxonomy)
- [Directory Map & Modular Layout](#directory-map--modular-layout)
- [Hardware Wiring & Pinout Matrix](#hardware-wiring--pinout-matrix)
- [Power Distribution Architecture](#power-distribution-architecture)
- [PC-Side Logic Verification & Unit Tests](#pc-side-logic-verification--unit-tests)
- [Bench Testing & Commissioning Checklist](#bench-testing--commissioning-checklist)
- [Production Readiness Constraints](#production-readiness-constraints)

---

## Firmware Suite Taxonomy

The `firmware/` repository encompasses two distinct implementations:

1. **`firmware/KavachHelmet/` (Production Reference Firmware):**
   - The authoritative firmware target intended for flashing directly onto physical ESP32 hardware.
   - Fully synchronized with the Supabase schema, the root `.env` device identifier (`HELMET_001`), and the production mobile client.
   - Comprehensive implementation details: [KavachHelmet Reference Guide](KavachHelmet/README.md).
   - Step-by-step hardware commissioning: [Hardware Bring-up Checklist](BRINGUP.md).

2. **`firmware/smart_helmet/` (Modular Prototype & PC-Tested Logic):**
   - An earlier modular architectural prototype preserved for its clean C++ decoupling.
   - Provides native PC-executable unit tests (`make test`) verifying debounce kinematics, cancel window state machines, and GSM AT driver parsing without physical hardware.

---

## Directory Map & Modular Layout

```text
firmware/
├── BRINGUP.md                     # Step-by-step bench commissioning checklist
├── Makefile                       # Host compilation targets (make test, make fixtures)
├── README.md                      # This firmware architecture manual
│
├── KavachHelmet/                  # Authoritative ESP32 flashing target
│   ├── KavachHelmet.ino           # Core microcontroller execution loop
│   ├── config.example.h           # Template hardware configuration
│   └── README.md                  # Comprehensive hardware reference manual
│
└── smart_helmet/                  # Modular C++ logic & PC unit test harness
    ├── smart_helmet.ino           # Top-level sketch
    ├── pins.h                     # Hardware pin definitions
    ├── accident_detector.h        # Inertial impact evaluation with debounce
    ├── alert_flow.h               # Cancellation window and buzzer control
    ├── sim800.h                   # Asynchronous non-blocking cellular driver
    ├── payloads.h                 # JSON telemetry and SMS message builders
    └── tests/                     # Host-based test cases for PC execution
```

---

## Hardware Wiring & Pinout Matrix

Standard pin allocation for 30-pin and 38-pin **ESP32 DevKit / WROOM** microcontrollers:

| Component Subsystem | Module Pin | ESP32 GPIO | Electrical Specification | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **MPU6050 Accelerometer** | SDA | **GPIO 21** | 3.3 V I2C Data | Tri-axis inertial acceleration |
| **MPU6050 Accelerometer** | SCL | **GPIO 22** | 3.3 V I2C Clock | Tri-axis rotational angular velocity |
| **NEO-6M GPS Module** | TX | **GPIO 16** | 3.3 V UART RX2 | Satellite positioning stream |
| **NEO-6M GPS Module** | RX | **GPIO 17** | 3.3 V UART TX2 | Positioning module configuration |
| **SIM800L / SIM900A Modem** | TXD | **GPIO 26** | 3.3 V Level Shifted RX1 | Cellular response data |
| **SIM800L / SIM900A Modem** | RXD | **GPIO 27** | 3.3 V UART TX1 | Cellular AT commands |
| **Piezo Buzzer (Active)** | Positive | **GPIO 25** | Transistor Switched | Audible pre-alert warning tone |
| **Rider Cancel Button** | Terminal 1 | **GPIO 33** | Internal Pull-Up to GND | 10-second false alarm abort |
| **Status LED** | Anode | **GPIO 2** | On-Board Current Limited | Heartbeat and diagnostic indicator |
| **Ground Bus** | GND | **GND** | Direct Low-Impedance Plane| Unified system reference ground |

---

## Power Distribution Architecture

*Power delivery faults represent the most common cause of MCU resets and modem transmission failures.*

- **Current Surge Characteristics:** Cellular transceivers emit RF power bursts requiring up to **2.0 A** of transient current.
- **Power Isolation:** The ESP32 on-board low-dropout regulator cannot sustain cellular transmission loads. The modem requires an independent, dedicated 3.7 V to 4.2 V supply rail powered by an external buck converter or high-discharge lithium polymer cell.
- **Filtering & Grounding:** Connect a **1000 uF electrolytic capacitor** directly across the modem supply terminals. Ensure a unified, continuous ground plane across the ESP32, GPS, MPU6050, and cellular modem.

---

## PC-Side Logic Verification & Unit Tests

The modular logic in `firmware/smart_helmet/` can be compiled and verified natively on any host PC running GCC or Clang without requiring physical embedded hardware:

```bash
# Execute full C++ unit test suite from repository root
cd firmware
make test
```

### Automated Logic Checks

- `test_detector`: Validates multi-sample impact accumulation, high-G transient suppression, and minimum debounce duration.
- `test_flow`: Verifies the state machine progression (*Normal -> Warning -> 10s Cancellation Window -> Emergency Dispatch -> Post-Incident Cooldown*).
- `test_sim800`: Verifies non-blocking buffer management, unsolicited result code (*URC*) parsing, and delivery report interpretation.

---

## Bench Testing & Commissioning Checklist

For step-by-step physical hardware verification, refer to the [Hardware Bring-up Checklist](BRINGUP.md).

1. **Verify Static Sensor Output:** Connect the serial monitor at **115200 baud**. Verify the MPU6050 initializes with stationary gravitational acceleration measuring approximately **1.00 G**.
2. **Evaluate Impact Sensitivity:** Firmly tap the test bench fixture to confirm threshold transitions from `normal` to `alert`.
3. **Verify Satellite Positioning:** Place the GPS antenna with clear sky visibility. Confirm valid coordinates populate and that missing satellite fixes degrade gracefully with `gpsValid = false` and `null` coordinates.
4. **Inspect GSM Network Registration:** Verify modem status commands return `+CREG: 0,1` (*Home Network*) or `+CREG: 0,5` (*Roaming Registered*).
5. **Emergency SMS Delivery:** Confirm receipt of an emergency SMS containing accurate detection timestamps and an active Google Maps URL.

---

## Production Readiness Constraints

- **Calibration Notice:** Thresholds hardcoded into the reference firmware represent baseline testing defaults. Comprehensive drop-tower testing is mandatory prior to vehicular deployment.
- **Cellular Bandwidth:** The reference hardware relies on quad-band 2G GSM cellular infrastructure. Verify carrier coverage and 2G sunset schedules within the target operational region.
- **Credential Protection:** Hardware tokens, Wi-Fi passwords, and API keys must remain strictly within local `config.h` files and must never be committed to git history.
