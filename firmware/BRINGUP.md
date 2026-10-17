# Hardware bring-up checklist: `firmware/KavachHelmet`

Do the steps in order. Do not move on until the previous one passes. Write the Serial Monitor result next to each step.
Everything here needs the real ESP32 and modules; nothing in `npm test` covers it. Wiring: [KavachHelmet/README.md](KavachHelmet/README.md).

## 0. Safety first

- Bench only, helmet NOT worn. Never test impacts with the helmet on a person.
- The SMS goes out for real. Use your own phone as `SMS_RECIPIENT_E164` while testing.
- **SIM900A power**: a separate supply that can give about 2 A in bursts (check the board label, usually 5 V). USB or the ESP32 3V3 pin is not enough.
  Put a 1000 uF capacitor close to the module and join all grounds.
- **Logic levels**: ESP32 pins are 3.3 V only. If SIM900A TXD is 5 V, use a divider (1 kΩ + 2 kΩ) or a level shifter to GPIO 26. Check with a multimeter first.
- SIM900A is 2G only: make sure the carrier still has 2G where you test. Wi-Fi must be 2.4 GHz.

## 1. Firebase side (Person 2 / whoever owns the Firebase project)

Needed before the helmet can write anything: Anonymous sign-in on, rules and Functions deployed, the app opened once in live mode (to create its anonymous user),
then in `backend/functions`: `node scripts/provision-device.js HELMET_001 <that user's uid>`. The script prints a short-lived custom token. Keep it private.
Details: `backend/firebase/SETUP.md`.

## 2. Compile and flash

1. Arduino IDE, Boards Manager: **esp32 by Espressif**. Library Manager: **Adafruit MPU6050**, **Adafruit Unified Sensor**, **TinyGPSPlus**, **ArduinoJson 7**.
2. Copy `KavachHelmet/config.example.h` to `KavachHelmet/config.h` (git-ignored, never commit it).
3. Fill it: `WIFI_SSID` / `WIFI_PASSWORD` (2.4 GHz hotspot), `FIREBASE_API_KEY`, `FIREBASE_DATABASE_URL`, `DEVICE_ID` (same as the app's `EXPO_PUBLIC_DEVICE_ID`), `SMS_RECIPIENT_E164` (your phone, `+91...`). Leave `FIREBASE_ROOT_CA` as it is.
4. Board **ESP32 Dev Module**, right COM port, **Verify** then **Upload** (hold BOOT if it hangs on "Connecting...").
5. Serial Monitor at **115200**. Expect `Kavach ESP32 reference firmware starting.`

Pass: compiles, uploads, banner appears. If compile fails, copy the first error line. Messages like `Replace all placeholder values in config.h` mean step 3 is incomplete.

## 3. Sensor, Wi-Fi, Firebase

| Check | Expected Serial line | If not |
|---|---|---|
| MPU6050 | no `MPU6050 not detected on I2C.` | check SDA 21, SCL 22, 3V3, GND |
| Wi-Fi | `Wi-Fi connected: <ip>` | wrong SSID/password, or 5 GHz network |
| Time | no `NTP time sync failed` | network blocks NTP; try another hotspot |
| First boot | `Paste the one-time Firebase custom token ...` | paste the token from step 1 and press Enter |
| Provisioned | `Firebase device identity provisioned; refresh token saved in NVS.` | token expired: run `provision-device.js` again |
| Telemetry | `Telemetry sent; impact x.xx g, GPS ..., GSM ...` every 10 s | `HTTPS PUT failed (401/403)`: rules or `device_id` claim wrong; `Telemetry upload failed`: check URL and Wi-Fi |

Then check Firebase console: `devices/HELMET_001` updates every 10 s, and the app (live mode, provisioned user) shows the helmet connected.

## 4. GPS

Put the NEO-6M near a window or outside; a first fix can take several minutes.
Pass: `GPS valid` in the telemetry line (`GPS searching` means no fix yet), `gpsValid: true` and coordinates in `devices/HELMET_001`, the Location tab shows a marker. Indoors without a fix the app must show no coordinates (also a valid result).

## 5. SIM900A registration and SMS

1. Insert a SIM with SMS balance, power the module, reset the ESP32.
2. Expect `SIM900A network registration: registered`. `not registered`: check SIM, antenna, 2G coverage, supply, TX/RX wiring (GPIO 26 receives, 27 sends).
3. Real SMS test happens with the impact test in step 6 (the sketch has no manual send command). Pass: the SMS arrives on your phone with a Google Maps link, and the alert has `smsStatus` `unknown` (submission accepted) or `failed`.
   `unknown` is expected: the modem confirms submission, not delivery. Receiving the SMS is the real confirmation.

## 6. Impact threshold: calibrate safely

Constants are at the top of `KavachHelmet.ino`: `WARNING_THRESHOLD_G = 1.8`, `IMPACT_THRESHOLD_G = 3.0`; the alert cooldown is 60 s (`ALERT_COOLDOWN_MS`).
The sketch prints the impact value (g) only in the telemetry line, which comes every 10 s (and once when an alert triggers), so it is a snapshot, not the peak.
To see peaks, temporarily add `Serial.println(impactG);` after `lastImpactG = impactG;` in `loop()`, and remove it afterwards.
Note: one single sample at or above the threshold triggers an alert (there is no multi-sample debounce), so a sharp bump can trigger it; keep that in mind when choosing the threshold.

1. Mount the MPU6050 firmly as it will sit in the helmet. At rest the value is about 1.0 g.
2. Normal handling (pick up, put down, carry, shake gently, drop on a pillow from 10 cm): note the highest g. It must stay **below** `IMPACT_THRESHOLD_G` (no alert).
3. Impact fixture: helmet fixed on a table, strike it with a rubber mallet or drop a soft weight on it from a fixed height. No person involved. Note g.
4. Pick `IMPACT_THRESHOLD_G` above your highest handling value and below the weakest impact you want to catch. Edit, upload, repeat steps 2 and 3.
5. Require 10 handling trials with no alert and 10 impact trials with an alert. Remember the 60 s cooldown between impact trials, and that a still-pending alert blocks the next one (`An earlier alert is still pending; this impact was not queued.`).

## 7. Failure checks (quick)

Turn the hotspot off during an alert: expect the alert to be retried after Wi-Fi returns, once. Reboot with a pending alert: it is resumed, SMS is not duplicated.
Cover the GPS antenna: `gpsValid` goes false, coordinates are null, the app shows no marker.

## Report back

Send: the Serial Monitor output of steps 2, 3, 4, 5 (or the first line that failed), your handling and impact g values, the final `IMPACT_THRESHOLD_G`, and whether the SMS and the app alert both arrived.
