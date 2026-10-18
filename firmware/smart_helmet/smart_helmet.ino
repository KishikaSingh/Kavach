// Smart Helmet firmware (ESP32): accident detection, emergency SMS, live status to Firebase.
//
//   core 1 (loop)        : sensor sampling, accident detection, cancel button, buzzer, GPS, SIM800L.
//                          Never waits for Wi-Fi or Firebase, so an outage cannot delay an emergency SMS.
//   core 0 (uploadTask)  : Wi-Fi, NTP time, Firebase uploads (device status + alert records).
//
// The decision logic lives in the plain C++ headers (tested on a PC, see tests/). This file only
// connects it to the hardware.
//
// Setup: copy config.h.example to config.h and fill it in. Libraries: "TinyGPSPlus" (Mikal Hart).
// Board: any "ESP32 Dev Module" with the Espressif ESP32 core.

#if !__has_include("config.h")
#error "config.h is missing: copy config.h.example to config.h and fill in your values."
#endif

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>
#include <TinyGPSPlus.h>

#include "config.h"
#include "pins.h"
#include "accident_detector.h"
#include "alert_flow.h"
#include "alert_sync.h"
#include "payloads.h"
#include "sim800.h"
#include "arduino_adapters.h"
#include "mpu6050_reader.h"
#include "firebase_client.h"

// ---------------------------------------------------------------------------------------------
// Tuning that does not belong in config.h
// ---------------------------------------------------------------------------------------------
static const uint32_t GPS_FRESH_MS        = 10000;   // a fix older than this is not "valid now"
static const uint32_t SAMPLE_EVERY_MS     = 10;      // ~100 Hz acceleration sampling
static const uint32_t SMS_GIVEUP_MS       = 180000;  // stop trying to START an SMS after 3 minutes
static const uint32_t SMS_TRACK_MS        = 150000;  // stop waiting for delivery reports after this
static const uint32_t SMS_RETRY_GAP_MS    = 5000;
static const uint8_t  SMS_MAX_ATTEMPTS    = 3;
static const uint32_t SMS_TRY_UNREGISTERED_AFTER_MS = 30000;  // send anyway if "registered" never shows up

// ---------------------------------------------------------------------------------------------
// Hardware objects
// ---------------------------------------------------------------------------------------------
static HardwareSerial gpsSerial(2);
static HardwareSerial simSerial(1);
static HardwareSerialStream simStream(simSerial);
static TinyGPSPlus gps;
static Mpu6050 mpu;
static Sim800 sim(simStream);
static AccidentDetector detector;
static AlertFlow flow(CANCEL_WINDOW_MS);
static AlertSync alertSync;
static FirebaseClient firebase;

// ---------------------------------------------------------------------------------------------
// State shared between the two cores (guarded by `mutex`; never held during network calls)
// ---------------------------------------------------------------------------------------------
static SemaphoreHandle_t mutex;

struct Lock {
  Lock() { xSemaphoreTake(mutex, portMAX_DELAY); }
  ~Lock() { xSemaphoreGive(mutex); }
};

struct Shared {
  AccidentLevel level = AccidentLevel::Normal;
  bool gpsValid = false;
  double lat = 0, lon = 0;
  bool everFixed = false;
  uint32_t fixUptimeMs = 0;       // when the last valid fix was received (millis)
  bool gsmRegistered = false;
  bool mpuOk = false;
};
static Shared shared;                   // written by loop(), read by the upload task
static volatile bool netOnline = false; // upload task -> status LED

// ---------------------------------------------------------------------------------------------
// Emergency SMS job (runs on core 1)
// ---------------------------------------------------------------------------------------------
struct SmsJob {
  bool active = false;
  bool sendingDone = false;
  uint32_t startMs = 0;
  uint32_t doneMs = 0;
  char text[170] = {0};
  int count = 0;
  int cur = -1;                         // index of the number being sent right now
  int ticket[2] = {-1, -1};
  uint8_t attempts[2] = {0, 0};
  bool gaveUp[2] = {false, false};
  uint32_t nextTryMs[2] = {0, 0};
};
static SmsJob job;
static const char* numbers[2];
static int numberCount = 0;

struct AccidentFix {
  bool valid = false;
  double lat = 0, lon = 0;
};
static AccidentFix accidentFix;          // position at the moment of impact
static uint32_t accidentMs = 0;          // millis() at the moment of impact

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
static int64_t currentEpoch() {
  time_t t = time(nullptr);
  return epochLooksValid((int64_t)t) ? (int64_t)t : 0;
}

static bool validPhoneNumber(const char* n) {
  if (!n || n[0] != '+') return false;
  size_t len = strlen(n);
  if (len < 9 || len > 16) return false;
  for (size_t i = 1; i < len; i++) if (n[i] < '0' || n[i] > '9') return false;
  return true;
}

static bool freshFix(double& lat, double& lon) {
  if (gps.location.isValid() && gps.location.age() < GPS_FRESH_MS) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    return coordsUsable(true, lat, lon);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// SMS job
// ---------------------------------------------------------------------------------------------
static void releaseTickets() {
  for (int i = 0; i < 2; i++) {
    if (job.ticket[i] >= 0) sim.release(job.ticket[i]);
    job.ticket[i] = -1;
  }
}

static void startSmsJob(uint32_t now, bool gpsValid, double lat, double lon) {
  if (job.active) releaseTickets();       // an older job is still waiting for reports: drop it
  job = SmsJob();
  job.active = true;
  job.startMs = now;
  job.count = numberCount;
  buildSmsText(job.text, sizeof(job.text), gpsValid, lat, lon);
  Serial.printf("[sms] sending to %d number(s): %s\n", job.count, job.text);
}

static void smsStep(uint32_t now) {
  if (!job.active) return;

  if (!job.sendingDone) {
    // The message being sent right now finished?
    if (job.cur >= 0) {
      int i = job.cur;
      int t = job.ticket[i];
      if (sim.sendFinished(t)) {
        job.cur = -1;
        if (sim.sendState(t) == SendState::Failed) {      // definitely not sent: retry later
          sim.release(t);
          job.ticket[i] = -1;
          if (++job.attempts[i] >= SMS_MAX_ATTEMPTS) job.gaveUp[i] = true;
          else job.nextTryMs[i] = now + SMS_RETRY_GAP_MS;
          Serial.printf("[sms] number %d failed (attempt %d)\n", i + 1, job.attempts[i]);
        } else if (sim.accepted(t)) {
          Serial.printf("[sms] number %d accepted by the network, waiting for delivery report\n", i + 1);
        } else {
          Serial.printf("[sms] number %d: modem never answered, outcome unknown\n", i + 1);
        }
      }
    } else if (!sim.sendingNow()) {
      // Start the next number that still needs sending (one at a time: the modem has one AT channel).
      for (int i = 0; i < job.count; i++) {
        if (job.ticket[i] >= 0 || job.gaveUp[i]) continue;
        if ((int32_t)(now - job.nextTryMs[i]) < 0) continue;
        bool allowed = sim.registered() || (uint32_t)(now - job.startMs) > SMS_TRY_UNREGISTERED_AFTER_MS;
        if (allowed) {
          int t = sim.sendSms(numbers[i], job.text, now);
          if (t >= 0) { job.ticket[i] = t; job.cur = i; }
        }
        break;
      }
    }

    if ((uint32_t)(now - job.startMs) > SMS_GIVEUP_MS) {
      for (int i = 0; i < job.count; i++) if (job.ticket[i] < 0) job.gaveUp[i] = true;
    }

    bool allDone = true;
    for (int i = 0; i < job.count; i++) {
      bool finished = job.gaveUp[i] || (job.ticket[i] >= 0 && sim.sendFinished(job.ticket[i]));
      if (!finished) allDone = false;
    }
    if (allDone) {
      job.sendingDone = true;
      job.doneMs = now;
      flow.onSendingFinished(now);
    }
  }

  // Work out what to tell the app.
  NumberResult res[2] = {NumberResult::Pending, NumberResult::Pending};
  bool anyAccepted = false;
  for (int i = 0; i < job.count; i++) {
    int t = job.ticket[i];
    if (t >= 0) {
      res[i] = numberResultFrom(sim.sendState(t), sim.delivery(t));
      if (sim.accepted(t)) anyAccepted = true;
    } else {
      res[i] = job.gaveUp[i] ? NumberResult::Failed : NumberResult::Pending;
    }
  }
  const char* smsStatus = job.count == 0 ? "failed" : combineSmsStatus(res, job.count);
  const char* status = anyAccepted ? "sent" : "new";
  {
    Lock l;
    alertSync.setStatus(status, smsStatus);
  }

  // Done tracking: every ticket final, or the safety timeout passed.
  if (job.sendingDone) {
    bool allFinal = true;
    for (int i = 0; i < job.count; i++) {
      if (job.ticket[i] >= 0 && !sim.ticketFinal(job.ticket[i])) allFinal = false;
    }
    if (allFinal || (uint32_t)(now - job.doneMs) > SMS_TRACK_MS) {
      Serial.printf("[sms] final: status=%s smsStatus=%s\n", status, smsStatus);
      releaseTickets();
      job.active = false;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Accident handling
// ---------------------------------------------------------------------------------------------
static void onAccidentDetected(uint32_t now, bool simulated) {
  if (!flow.onAccident(now)) return;
  accidentMs = now;
  double lat, lon;
  accidentFix.valid = freshFix(lat, lon);
  accidentFix.lat = accidentFix.valid ? lat : 0;
  accidentFix.lon = accidentFix.valid ? lon : 0;
  Serial.printf("[accident] %sdetected. Press the cancel button within %d s to stop the alert.\n",
                simulated ? "(simulated) " : "", (int)(CANCEL_WINDOW_MS / 1000));
}

static void onCancelWindowExpired(uint32_t now) {
  // Prefer the position right now (the rider has stopped moving); fall back to the one at impact.
  double lat = 0, lon = 0;
  bool valid = freshFix(lat, lon);
  if (!valid && accidentFix.valid) { valid = true; lat = accidentFix.lat; lon = accidentFix.lon; }
  {
    Lock l;
    alertSync.begin(accidentMs, valid, lat, lon);
  }
  startSmsJob(now, valid, lat, lon);
}

// ---------------------------------------------------------------------------------------------
// Cancel button (debounced, reports one press per push)
// ---------------------------------------------------------------------------------------------
static bool buttonPressed(uint32_t now) {
  static bool lastLow = false, reported = false;
  static uint32_t changedAt = 0;
  bool low = digitalRead(PIN_CANCEL_BUTTON) == LOW;
  if (low != lastLow) { lastLow = low; changedAt = now; reported = false; }
  if (low && !reported && (uint32_t)(now - changedAt) >= 30) { reported = true; return true; }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Upload task (core 0)
// ---------------------------------------------------------------------------------------------
static void doAlertSync(uint32_t now) {
  SyncOp op;
  uint32_t gen;
  AlertRecord rec;
  int64_t epoch = currentEpoch();
  {
    Lock l;
    if (alertSync.needsTimestamp() && epoch != 0) {
      char iso[24];
      uint32_t ageS = (uint32_t)(now - alertSync.record().eventUptimeMs) / 1000;
      if (formatIso(epoch - (int64_t)ageS, iso, sizeof(iso))) alertSync.setTimestamp(iso);
    }
    op = alertSync.nextOp(now, ALERT_RETRY_MS);
    gen = alertSync.generation();
    rec = alertSync.record();
  }
  if (op == SyncOp::None) return;

  char json[256];
  bool ok = false;
  if (op == SyncOp::Create) {
    int n = buildAlertCreateJson(json, sizeof(json), rec.timestampIso, rec.gpsValid, rec.latitude, rec.longitude);
    char id[48] = {0};
    ok = n > 0 && firebase.createAlert(json, id, sizeof(id));
    Lock l;
    if (ok) { alertSync.onCreateOk(gen, id); Serial.printf("[cloud] alert created: %s\n", id); }
    else alertSync.onFail(gen, millis());
  } else {
    int n = buildAlertPatchJson(json, sizeof(json), rec.status, rec.smsStatus);
    ok = n > 0 && firebase.patchAlert(rec.remoteId, json);
    Lock l;
    if (ok) { alertSync.onPatchOk(gen, rec.status, rec.smsStatus); Serial.printf("[cloud] alert updated: %s / %s\n", rec.status, rec.smsStatus); }
    else alertSync.onFail(gen, millis());
  }
}

static void doTelemetry() {
  Shared s;
  {
    Lock l;
    s = shared;
  }
  int64_t epoch = currentEpoch();
  DeviceSnapshot d;
  d.deviceId = DEVICE_ID;
  d.level = s.level;
  d.gpsValid = s.gpsValid;
  d.latitude = s.lat;
  d.longitude = s.lon;
  d.gpsFixEpoch = (s.everFixed && epoch != 0) ? epoch - (int64_t)((uint32_t)(millis() - s.fixUptimeMs) / 1000) : 0;
  d.gsmRegistered = s.gsmRegistered;
  d.mpuOk = s.mpuOk;
  d.nowEpoch = epoch;

  char json[512];
  int n = buildDeviceJson(json, sizeof(json), d);
  netOnline = n > 0 && firebase.putDevice(json);
}

static void uploadTask(void*) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  bool triedWifi = false, ntpStarted = false;
  uint32_t lastWifiTry = 0, lastTelemetry = 0;

  for (;;) {
    uint32_t now = millis();
    if (WiFi.status() != WL_CONNECTED) {
      netOnline = false;
      if (!triedWifi || (uint32_t)(now - lastWifiTry) > 15000) {
        triedWifi = true;
        lastWifiTry = now;
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        Serial.println("[wifi] connecting...");
      }
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }
    if (!ntpStarted) {
      configTime(0, 0, "pool.ntp.org", "time.google.com");
      ntpStarted = true;
      Serial.printf("[wifi] connected, IP %s\n", WiFi.localIP().toString().c_str());
    }

    doAlertSync(now);                       // an accident record always goes first

    if ((uint32_t)(now - lastTelemetry) >= TELEMETRY_INTERVAL_MS) {
      lastTelemetry = now;
      doTelemetry();
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ---------------------------------------------------------------------------------------------
// setup / loop (core 1)
// ---------------------------------------------------------------------------------------------
static float lastMagG = 1.0f;

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nSmart Helmet starting (device " DEVICE_ID ")");

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  pinMode(PIN_CANCEL_BUTTON, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);

  mutex = xSemaphoreCreateMutex();

  DetectorConfig dc;
  dc.warnG = WARNING_THRESHOLD_G;
  dc.impactG = IMPACT_THRESHOLD_G;
  dc.minConsecutive = IMPACT_MIN_SAMPLES;
  dc.cooldownMs = COOLDOWN_MS;
  detector = AccidentDetector(dc);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(400000);
  Wire.setTimeOut(50);
  bool mpuOk = mpu.begin();
  Serial.printf("[mpu] %s\n", mpuOk ? "ready" : "NOT FOUND - check wiring (SDA 21, SCL 22)");
  { Lock l; shared.mpuOk = mpuOk; }

  gpsSerial.setRxBufferSize(1024);
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  simSerial.setRxBufferSize(1024);
  simSerial.begin(SIM_BAUD, SERIAL_8N1, PIN_SIM_RX, PIN_SIM_TX);
  sim.begin(millis());

  const char* configured[2] = {EMERGENCY_NUMBER_1, EMERGENCY_NUMBER_2};
  for (int i = 0; i < 2; i++) {
    if (configured[i][0] == 0) continue;
    if (validPhoneNumber(configured[i])) numbers[numberCount++] = configured[i];
    else Serial.printf("[sms] ignoring invalid number '%s' (use +countrycode...)\n", configured[i]);
  }
  if (numberCount == 0) Serial.println("[sms] WARNING: no valid emergency number configured, alerts cannot be sent!");

  xTaskCreatePinnedToCore(uploadTask, "upload", 20480, nullptr, 1, nullptr, 0);

  digitalWrite(PIN_BUZZER, HIGH); delay(120); digitalWrite(PIN_BUZZER, LOW);   // boot beep
  Serial.println("Ready. Type 't' in the Serial Monitor to simulate an accident.");
}

void loop() {
  uint32_t now = millis();

  // Feed the parsers.
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());
  sim.poll(now);

  // Sample the accelerometer at ~100 Hz.
  static uint32_t lastSample = 0;
  static uint16_t mpuFails = 0;
  static bool mpuOk = true;
  if ((uint32_t)(now - lastSample) >= SAMPLE_EVERY_MS) {
    lastSample = now;
    float mag;
    if (mpu.readMagnitudeG(mag)) {
      mpuFails = 0;
      mpuOk = true;
      lastMagG = mag;
      if (detector.update(mag, now)) onAccidentDetected(now, false);
    } else {
      detector.update(NAN, now);            // a failed read breaks any impact streak
      if (mpuFails < 65535) mpuFails++;
      if (mpuFails >= 50) mpuOk = false;    // half a second without data
      if (mpuFails % 200 == 0) mpu.begin(); // try to wake the sensor again every 2 s
    }
  }

  // Test helper: type 't' to simulate an impact without hitting the helmet.
  if (Serial.available() > 0) {
    int c = Serial.read();
    if (c == 't' || c == 'T') onAccidentDetected(now, true);
  }

  // Cancel button and alert flow.
  if (buttonPressed(now) && flow.onCancelPressed()) Serial.println("[accident] cancelled by the rider");
  if (flow.update(now) == FlowEvent::SendNow) onCancelWindowExpired(now);
  smsStep(now);

  digitalWrite(PIN_BUZZER, flow.buzzerOn(now) ? HIGH : LOW);
  digitalWrite(PIN_STATUS_LED, netOnline ? HIGH : ((now / 500) % 2 == 0 ? HIGH : LOW));

  // Publish the current state for the upload task.
  {
    double lat = 0, lon = 0;
    bool valid = freshFix(lat, lon);
    AccidentLevel level = flow.active() ? AccidentLevel::Alert
                        : detector.warningActive(now) ? AccidentLevel::Warning : AccidentLevel::Normal;
    Lock l;
    shared.level = level;
    shared.gpsValid = valid;
    shared.lat = valid ? lat : 0;
    shared.lon = valid ? lon : 0;
    if (valid) { shared.everFixed = true; shared.fixUptimeMs = now - gps.location.age(); }
    shared.gsmRegistered = sim.registered();
    shared.mpuOk = mpuOk;
  }

  // One status line every 5 s.
  static uint32_t lastPrint = 0;
  if ((uint32_t)(now - lastPrint) >= 5000) {
    lastPrint = now;
    Serial.printf("[status] g=%.2f gps=%s sats=%d gsm=%s wifi=%s mpu=%s flow=%d\n",
                  lastMagG, gps.location.isValid() && gps.location.age() < GPS_FRESH_MS ? "fix" : "no-fix",
                  gps.satellites.isValid() ? (int)gps.satellites.value() : 0,
                  sim.registered() ? "ok" : (sim.ready() ? "searching" : "no-modem"),
                  netOnline ? "online" : "offline", mpuOk ? "ok" : "FAIL", (int)flow.state());
  }

  delay(1);
}
