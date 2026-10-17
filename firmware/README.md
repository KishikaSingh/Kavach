# `smart_helmet` firmware (earlier prototype, PC-tested logic)

> **Not the firmware to flash.** The team's firmware is [`KavachHelmet/`](KavachHelmet/README.md); its bench checklist is [BRINGUP.md](BRINGUP.md).
> This prototype signs in to Firebase with email/password. The current database rules only accept writes from a device identity
> with the `device_id` custom claim, so it would be denied. It is kept because its logic (cancel window, SMS delivery reports,
> alert/Firebase sync) is unit-tested on a PC (`make test`) and can be ported to `KavachHelmet` later.

Detects an accident, gives the rider 10 seconds to cancel, then texts the emergency numbers with the
GPS location, and keeps Firebase up to date so the web dashboard and the app can show it.

```
firmware/
  Makefile                 make test  -> runs the logic tests on your PC
  smart_helmet/            the Arduino sketch folder (open smart_helmet.ino)
    smart_helmet.ino       wires everything to the hardware
    config.h.example       copy to config.h and fill in (config.h is gitignored)
    pins.h                 pin map
    accident_detector.h    impact detection with debounce + cooldown      } plain C++,
    alert_flow.h           cancel window -> sending -> done, buzzer pattern} tested on a PC
    sim800.h               non-blocking SIM800L driver with delivery reports}
    payloads.h             JSON + SMS text builders, SMS status combining  }
    alert_sync.h           keeps one alert record in step with Firebase    }
    mini_json.h            tiny JSON value reader                          }
    mpu6050_reader.h       MPU6050 driver (no library needed)
    firebase_client.h      Firebase REST: sign-in, token refresh, PUT/POST/PATCH
    arduino_adapters.h     HardwareSerial -> ByteStream
    tests/                 PC tests (they are NOT part of the Arduino build)
```

## 1. Wiring (standard 30/38-pin ESP32 DevKit)

| Part | Part pin | ESP32 pin |
|---|---|---|
| MPU6050 | SDA / SCL | GPIO 21 / GPIO 22 |
| MPU6050 | VCC / GND | 3V3 / GND |
| GPS (NEO-6M) | TX → | GPIO 16 (RX2) |
| GPS (NEO-6M) | RX ← | GPIO 17 (TX2) |
| SIM800L | TXD → | GPIO 26 |
| SIM800L | RXD ← | GPIO 27 |
| Buzzer (active) | + / − | GPIO 25 (via transistor if > 20 mA) / GND |
| Cancel button | one side / other side | GPIO 33 / GND (internal pull-up) |
| Status LED | — | GPIO 2 (on-board) |

**SIM800L power is the #1 cause of "it doesn't work".** It needs 3.7–4.2 V and draws up to 2 A in
short bursts. Do not power it from the ESP32 3V3 pin or from USB through a thin wire. Use a
Li-ion cell or a 4 V buck converter rated 2 A, with a 1000 µF capacitor close to the module, and
connect all grounds together. Use a SIM that has an active plan and SMS balance, with the PIN lock off.

## 2. Software setup

1. Install Arduino IDE (or PlatformIO) and the **Espressif ESP32** board package.
2. Library Manager → install **TinyGPSPlus** (by Mikal Hart). Nothing else is needed.
3. Copy `smart_helmet/config.h.example` to `smart_helmet/config.h` and fill in the values
   (Wi-Fi, Firebase host + API key, device login, emergency numbers in `+countrycode…` format).
4. Board: **ESP32 Dev Module**. Open `smart_helmet.ino`, upload, open Serial Monitor at **115200**.

## 3. Firebase setup (do this with Person 2)

1. Firebase console → Authentication → add an **Email/Password** user for the helmet
   (the email and password you put in `config.h`). Copy its **UID**.
2. The helmet writes only to `/devices/{DEVICE_ID}` and `/alerts/{DEVICE_ID}/…`, exactly as the frozen layout says.
3. Rules must let that UID write there. Starting point (merge into Person 2's rules, do not replace them):

```json
{
  "rules": {
    "devices": { "$deviceId": { ".read": "auth != null", ".write": "auth.uid === 'PASTE_HELMET_UID'" } },
    "alerts":  { "$deviceId": { ".read": "auth != null", ".write": "auth.uid === 'PASTE_HELMET_UID'" } }
  }
}
```
   Signed-in app users also need permission to mark an alert `resolved`; add that to the alerts rule.
4. `DEVICE_ID` must be the same value the app/dashboard use (`HELMET_001` by default).

## 4. What the helmet writes

`/devices/{id}` every `TELEMETRY_INTERVAL_MS` (3 s): `helmetStatus` (always `connected`; the app marks
the helmet disconnected when updates stop for 30 s), `accidentStatus` (`normal` / `warning` while a
spike was recent / `alert` during an alert), `latitude`, `longitude`, `gpsValid`, `gpsLastFixAt`,
`gsmRegistered`, `mpuOk`, `lastUpdated`. `batteryLevel` and `alcoholDetected` are `null` because the
prototype has no such sensors. Unknown values are `null`, never invented. Coordinates are only sent
for a GPS fix that is less than 10 s old.

`/alerts/{id}/{alertId}` once per accident: created with `status: new`, `smsStatus: pending`, then updated:

| Field | Meaning |
|---|---|
| `status: sent` | at least one SMS was accepted by the mobile network |
| `smsStatus: confirmed` | at least one recipient's **delivery report** says delivered |
| `smsStatus: pending` | still sending, or waiting for a delivery report |
| `smsStatus: failed` | every recipient failed |
| `smsStatus: unknown` | accepted but no delivery report arrived (up to 2 min wait), or the modem never answered |

Note: "modem accepted the SMS" is deliberately **not** shown as delivered. If an earlier prompt said
`confirmed` means "the module confirmed sending", this stricter rule replaces it.

## 5. Test it on the bench

Step-by-step bring-up (flash, Wi-Fi/Firebase, GPS, SIM registration, SMS, threshold calibration): see [BRINGUP.md](BRINGUP.md).


Run the logic tests first (no hardware): `make test` in this folder → all three suites must report 0 failures.

Then with the board:

1. Serial Monitor shows `[mpu] ready`, and every 5 s a `[status]` line. Hold still: `g≈1.00`.
2. **Simulated accident:** type `t` + Enter. Buzzer beeps fast for 10 s. Press the button → `cancelled by the rider`, nothing is sent.
3. Type `t` again and do not press: after 10 s the SMS is sent, the buzzer beeps slowly, and the log shows
   `accepted by the network`, then a delivery report result. Check that the phone really received it.
4. **Real shake:** hit the helmet firmly on a table. A gentle bump must not trigger (needs ≥ 3 samples above 3.5 g). Tune `IMPACT_THRESHOLD_G` on a real helmet.
5. **Wi-Fi outage:** turn the hotspot off, trigger an alert (the SMS still goes out), turn it on again: the alert record appears in Firebase with the right time.
6. Check the dashboard/app shows the alert with the correct status and a map marker only if `gpsValid` is true.
7. Test indoors without GPS: the SMS must say "GPS location unavailable" and the alert must have `null` coordinates.

## 6. Known limits (be honest about them in the demo)

- The clock comes from NTP over Wi-Fi. If Wi-Fi never connects, the SMS still goes out but the alert record cannot be created in Firebase because it has no trustworthy timestamp.
- Only one alert record is tracked at a time. If a second accident happens after the 60 s cooldown while the first record still could not be uploaded, the older record is replaced (its SMS was already sent).
- `USE_INSECURE_TLS 1` skips certificate checks: fine for a prototype, not for production. Set it to `0` and add `FIREBASE_ROOT_CA` for a real deployment.
- The emergency numbers are in `config.h`; the app's contact list is not read by the helmet.
- Accident detection thresholds are untuned defaults. Calibrate with real tests before trusting them.
