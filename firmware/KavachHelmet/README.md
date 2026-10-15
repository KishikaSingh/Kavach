# Kavach ESP32 reference firmware

Arduino IDE reference implementation for an ESP32 DevKit/WROOM, MPU6050, NEO-6M GPS, and SIM900A GSM modem. It sends the telemetry and alert records expected by the app and Firebase rules.

This is a **prototype, not a certified or production-ready safety system**. The impact threshold is only a starting point; tune and test it on a controlled test rig before any rider testing. It can miss accidents or trigger falsely, and it must not replace a phone or other emergency system.

## Hardware and wiring

| Module | Module pin | ESP32 pin |
| --- | --- | --- |
| MPU6050 | SDA | GPIO 21 |
| MPU6050 | SCL | GPIO 22 |
| NEO-6M | TX | GPIO 16 (GPS UART RX) |
| NEO-6M | RX | GPIO 17 (GPS UART TX) |
| SIM900A | TXD | GPIO 26 (GSM UART RX) |
| SIM900A | RXD | GPIO 27 (GSM UART TX) |
| All modules | GND | Common ground |

Use 3.3 V-compatible I2C/UART logic or appropriate level shifting. Do not power a SIM900A from the ESP32 3.3 V pin: the modem needs a separate supply capable of its transmit-current peaks (typically around 2 A; confirm the specific board documentation). Check the SIM900A board's UART logic voltage before connecting it. The SIM900A is 2G-only; verify that the local carrier still supports 2G service and that the SIM is provisioned for SMS.

## Arduino IDE setup

1. Install the Espressif ESP32 board package and select the matching ESP32 board.
2. Install **Adafruit MPU6050**, **Adafruit Unified Sensor**, **TinyGPSPlus**, and **ArduinoJson 7** from Library Manager.
3. Copy `config.example.h` to `config.h` in this folder. Set Wi-Fi, Firebase web API key, Realtime Database URL, device ID, and the helmet's SMS recipient. `config.h` is ignored by Git.
4. Enable Anonymous sign-in in Firebase. Deploy the Realtime Database rules and Functions as described in `backend/firebase/SETUP.md`. The `DEVICE_ID` must match the app's `EXPO_PUBLIC_DEVICE_ID`.
5. In `backend/functions/`, run the documented `provision-device.js <deviceId> <ownerUid>` command. Keep the printed custom token private.
6. Open the serial monitor at **115200 baud**. On first boot, enter the short-lived custom token when prompted. It is exchanged over verified HTTPS for a Firebase refresh token stored in ESP32 NVS; subsequent boots use that refresh token.
7. Confirm GPS fix, MPU6050 initialization, Wi-Fi, Firebase telemetry, SIM registration, and SMS reception separately before testing accident alerts.

The Firebase API key is a client identifier, but the custom token and refresh token authorize writes as the provisioned device identity. Never commit or share either token. The stored NVS refresh token is not hardware-protected by this sketch; enable ESP32 flash encryption and secure boot for any non-lab use, and provision credentials only on a device you physically control. If the refresh token is revoked, erase the `kavach-auth` NVS namespace and provision again.

The bundled Google Trust Services GTS Root R1 certificate is public CA material used for TLS verification. It expires in 2036; replace it from the official Google Trust Services root repository before expiry or if the Firebase endpoints use a different trust chain. TLS verification is fail-closed; the firmware does not use `setInsecure()`.

## Data and behavior

- Writes `devices/{deviceId}` every 10 seconds. GPS coordinates are omitted when there is no fresh fix; the corresponding device telemetry contains null coordinates and `gpsValid: false`.
- Creates `alerts/{deviceId}/{alertId}` with `status: "new"` so the existing Cloud Function can notify owners. Alerts include an ISO-8601 UTC timestamp, impact severity, optional coordinates, and SMS status.
- The MPU6050 magnitude threshold is currently `3.0 g`, with a `1.8 g` warning state and a 60-second alert cooldown. These values are constants in `KavachHelmet.ino`; they require validation and calibration for the actual mounting position and helmet.
- The SMS recipient is `SMS_RECIPIENT_E164` in the untracked `config.h`. App emergency contacts are not synced to the firmware. SIM900A `+CMGS` confirms network submission, not delivery, so the firmware reports `smsStatus: "unknown"` rather than falsely claiming delivery; it reports `"failed"` when the modem rejects or cannot submit the message.
- Battery and alcohol-sensor values are written as null because those sensors are not part of this hardware configuration.
- One pending alert is persisted in NVS and retried across network failures/reboots. Additional impacts while that record is pending are not queued, and SMS can be sent only once; a reboot during sending leaves status `unknown` rather than risking duplicate texts. Do not rely on this prototype for emergency response until queue limits and failure behavior are tested.

## Safety and test checklist

- Test Wi-Fi loss/recovery, invalid Firebase credentials, token expiry/revocation, denied database writes, and reboot recovery of a queued alert.
- Confirm the app shows fresh telemetry within its 30-second disconnect window and stops showing coordinates when GPS is invalid or stale.
- Verify the Firebase alert triggers one notification per owner and that SMS delivery state is not represented as confirmed without a delivery receipt.
- Use a safe, repeatable impact test fixture to characterize false positives and false negatives. Do not induce impacts on a person wearing the helmet.
- Test power brownouts during SIM900A transmission, GPS loss, SIM/network registration loss, and ESP32 reboot behavior.
- Validate the local carrier's 2G availability and SMS terms. The device only sends to the separately configured number; changing app contacts does not change it.
