#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <ctype.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <math.h>
#include <Preferences.h>
#include <stdlib.h>
#include <string.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <time.h>

#include "config.h"

#if !defined(WIFI_SSID) || !defined(WIFI_PASSWORD) || !defined(FIREBASE_API_KEY) || \
    !defined(FIREBASE_DATABASE_URL) || !defined(DEVICE_ID) || !defined(SMS_RECIPIENT_E164)
#error "Copy config.example.h to config.h and fill in its required settings."
#endif

namespace {
constexpr uint32_t TELEMETRY_INTERVAL_MS = 10000;
constexpr uint32_t ALERT_RETRY_INTERVAL_MS = 5000;
constexpr uint32_t GPS_FIX_MAX_AGE_MS = 10000;
constexpr uint32_t ALERT_COOLDOWN_MS = 60000;
constexpr float WARNING_THRESHOLD_G = 1.8f;
constexpr float IMPACT_THRESHOLD_G = 3.0f;
constexpr uint8_t GPS_RX_PIN = 16;
constexpr uint8_t GPS_TX_PIN = 17;
constexpr uint8_t GSM_RX_PIN = 26;
constexpr uint8_t GSM_TX_PIN = 27;
constexpr uint8_t I2C_SDA_PIN = 21;
constexpr uint8_t I2C_SCL_PIN = 22;
constexpr char REFRESH_TOKEN_KEY[] = "refresh";
constexpr char PENDING_ALERT_ID_KEY[] = "pendingId";
constexpr char PENDING_ALERT_JSON_KEY[] = "pendingData";
constexpr char PENDING_ALERT_STAGE_KEY[] = "pendingStage";
constexpr char PENDING_ALERT_SMS_KEY[] = "pendingSms";

HardwareSerial gpsSerial(2);
HardwareSerial gsmSerial(1);
TinyGPSPlus gps;
Adafruit_MPU6050 mpu;
Preferences preferences;
String refreshToken;
String idToken;
time_t idTokenExpiresAt = 0;
time_t lastGpsFixAt = 0;
uint32_t lastTelemetryAt = 0;
uint32_t lastAlertAt = 0;
uint32_t lastAlertRetryAt = 0;
float lastImpactG = 0.0f;
bool mpuOk = false;
bool gsmRegistered = false;
bool ntpConfigured = false;
String pendingAlertId;
String pendingAlertJson;
String pendingAlertSmsStatus;
uint8_t pendingAlertStage = 0;

void processPendingAlert();

String urlEncode(const String &value) {
  String encoded;
  encoded.reserve(value.length() * 3);
  const char hex[] = "0123456789ABCDEF";
  for (size_t i = 0; i < value.length(); ++i) {
    const uint8_t c = static_cast<uint8_t>(value[i]);
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
        (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') {
      encoded += static_cast<char>(c);
    } else {
      encoded += '%';
      encoded += hex[c >> 4];
      encoded += hex[c & 0x0F];
    }
  }
  return encoded;
}

bool waitForClock() {
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  ntpConfigured = true;
  const uint32_t started = millis();
  while (time(nullptr) < 1704067200 && millis() - started < 20000) {
    delay(250);
  }
  return time(nullptr) >= 1704067200;
}

String isoTimestamp(time_t timestamp) {
  if (timestamp < 1704067200) return String();
  struct tm utc;
  gmtime_r(&timestamp, &utc);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(buffer);
}

String currentTimestamp() {
  return isoTimestamp(time(nullptr));
}

String databaseUrl(const String &path) {
  String base = FIREBASE_DATABASE_URL;
  while (base.endsWith("/")) base.remove(base.length() - 1);
  String url = base + "/" + path + ".json";
  if (idToken.length()) url += "?auth=" + urlEncode(idToken);
  return url;
}

bool httpsRequest(const String &url, const char *method, const String &body,
                  const char *contentType, String &response) {
  WiFiClientSecure client;
  client.setCACert(FIREBASE_ROOT_CA);
  HTTPClient http;
  if (!http.begin(client, url)) {
    Serial.println("HTTPS setup failed.");
    return false;
  }
  http.setTimeout(12000);
  if (contentType) http.addHeader("Content-Type", contentType);

  int status;
  if (strcmp(method, "POST") == 0) status = http.POST(body);
  else if (strcmp(method, "PUT") == 0) status = http.PUT(body);
  else if (strcmp(method, "PATCH") == 0) status = http.sendRequest("PATCH", body);
  else status = http.GET();

  response = http.getString();
  http.end();
  if (status < 200 || status >= 300) {
    Serial.printf("HTTPS %s failed (%d): %s\n", method, status, response.c_str());
    return false;
  }
  return true;
}

bool refreshFirebaseToken() {
  if (refreshToken.isEmpty()) return false;
  const String body = "grant_type=refresh_token&refresh_token=" + urlEncode(refreshToken);
  String response;
  const String url = "https://securetoken.googleapis.com/v1/token?key=" + String(FIREBASE_API_KEY);
  if (!httpsRequest(url, "POST", body, "application/x-www-form-urlencoded", response)) return false;

  JsonDocument json;
  if (deserializeJson(json, response) || !json["id_token"].is<const char *>() ||
      !json["refresh_token"].is<const char *>()) {
    Serial.println("Firebase refresh response was invalid.");
    return false;
  }
  idToken = json["id_token"].as<String>();
  refreshToken = json["refresh_token"].as<String>();
  idTokenExpiresAt = time(nullptr) + atoi(json["expires_in"] | "3600");
  preferences.putString(REFRESH_TOKEN_KEY, refreshToken);
  Serial.println("Firebase ID token refreshed.");
  return true;
}

bool signInWithProvisioningToken() {
  Serial.println();
  Serial.println("Paste the one-time Firebase custom token from provision-device.js, then press Enter:");
  String customToken;
  const uint32_t started = millis();
  while (customToken.isEmpty() && millis() - started < 300000) {
    if (Serial.available()) {
      customToken = Serial.readStringUntil('\n');
      customToken.trim();
    }
    delay(20);
  }
  if (customToken.isEmpty()) {
    Serial.println("No provisioning token received.");
    return false;
  }

  JsonDocument request;
  request["token"] = customToken;
  request["returnSecureToken"] = true;
  String body;
  serializeJson(request, body);
  customToken = "";

  String response;
  const String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" +
                     String(FIREBASE_API_KEY);
  if (!httpsRequest(url, "POST", body, "application/json", response)) return false;

  JsonDocument json;
  if (deserializeJson(json, response) || !json["idToken"].is<const char *>() ||
      !json["refreshToken"].is<const char *>()) {
    Serial.println("Firebase custom-token response was invalid.");
    return false;
  }
  idToken = json["idToken"].as<String>();
  refreshToken = json["refreshToken"].as<String>();
  idTokenExpiresAt = time(nullptr) + atoi(json["expiresIn"] | "3600");
  preferences.putString(REFRESH_TOKEN_KEY, refreshToken);
  Serial.println("Firebase device identity provisioned; refresh token saved in NVS.");
  return true;
}

bool ensureFirebaseToken() {
  if (WiFi.status() != WL_CONNECTED) return false;
  const time_t now = time(nullptr);
  if (!idToken.isEmpty() && now < idTokenExpiresAt - 60) return true;
  if (refreshFirebaseToken()) return true;
  if (!refreshToken.isEmpty()) {
    Serial.println("Stored refresh token could not be refreshed; preserving it and retrying later.");
    return false;
  }
  return signInWithProvisioningToken();
}

bool firebaseWrite(const String &path, JsonDocument &document, const char *method = "PATCH") {
  if (!ensureFirebaseToken()) return false;
  String body;
  serializeJson(document, body);
  String response;
  return httpsRequest(databaseUrl(path), method, body, "application/json", response);
}

bool firebaseRead(const String &path, String &response) {
  if (!ensureFirebaseToken()) return false;
  return httpsRequest(databaseUrl(path), "GET", "", nullptr, response);
}

void savePendingAlert(const String &alertId, const String &alertJson) {
  pendingAlertId = alertId;
  pendingAlertJson = alertJson;
  pendingAlertSmsStatus = "";
  pendingAlertStage = 0;
  preferences.putString(PENDING_ALERT_JSON_KEY, pendingAlertJson);
  preferences.putString(PENDING_ALERT_SMS_KEY, "");
  preferences.putUChar(PENDING_ALERT_STAGE_KEY, pendingAlertStage);
  preferences.putString(PENDING_ALERT_ID_KEY, pendingAlertId);
}

void clearPendingAlert() {
  preferences.remove(PENDING_ALERT_ID_KEY);
  preferences.remove(PENDING_ALERT_JSON_KEY);
  preferences.remove(PENDING_ALERT_SMS_KEY);
  preferences.remove(PENDING_ALERT_STAGE_KEY);
  pendingAlertId = "";
  pendingAlertJson = "";
  pendingAlertSmsStatus = "";
  pendingAlertStage = 0;
}

bool hasFreshGpsFix() {
  return gps.location.isValid() && gps.location.age() <= GPS_FIX_MAX_AGE_MS;
}

void drainGps() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
    if (gps.location.isUpdated() && gps.location.isValid()) lastGpsFixAt = time(nullptr);
  }
}

float readAccelerationMagnitudeG() {
  if (!mpuOk) return 0.0f;
  sensors_event_t acceleration;
  sensors_event_t gyroscope;
  sensors_event_t temperature;
  if (!mpu.getEvent(&acceleration, &gyroscope, &temperature)) {
    mpuOk = false;
    return 0.0f;
  }
  const float x = acceleration.acceleration.x;
  const float y = acceleration.acceleration.y;
  const float z = acceleration.acceleration.z;
  return sqrtf(x * x + y * y + z * z) / SENSORS_GRAVITY_EARTH;
}

bool sendAtCommand(const String &command, const char *expected, uint32_t timeoutMs) {
  while (gsmSerial.available()) gsmSerial.read();
  gsmSerial.println(command);
  String response;
  const uint32_t started = millis();
  while (millis() - started < timeoutMs) {
    while (gsmSerial.available()) {
      response += static_cast<char>(gsmSerial.read());
      if (response.indexOf(expected) >= 0) return true;
    }
    delay(10);
  }
  return false;
}

bool updateGsmRegistration() {
  while (gsmSerial.available()) gsmSerial.read();
  gsmSerial.println("AT+CREG?");
  String response;
  const uint32_t started = millis();
  while (millis() - started < 2500) {
    while (gsmSerial.available()) response += static_cast<char>(gsmSerial.read());
    if (response.indexOf("\nOK") >= 0 || response.indexOf("\r\nOK") >= 0) break;
    delay(10);
  }
  const int marker = response.indexOf("+CREG:");
  if (marker < 0) return false;
  const int comma = response.indexOf(',', marker);
  if (comma < 0 || comma + 1 >= static_cast<int>(response.length())) return false;
  int stateIndex = comma + 1;
  while (stateIndex < static_cast<int>(response.length()) &&
         isspace(static_cast<unsigned char>(response[stateIndex]))) {
    ++stateIndex;
  }
  if (stateIndex >= static_cast<int>(response.length())) return false;
  const char state = response[stateIndex];
  return state == '1' || state == '5';
}

const char *sendEmergencySms(const String &alertId, bool gpsValid, double latitude, double longitude) {
  if (!gsmRegistered || strlen(SMS_RECIPIENT_E164) < 8) return "failed";
  if (!sendAtCommand("AT+CMGF=1", "OK", 3000)) return "failed";

  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(SMS_RECIPIENT_E164);
  gsmSerial.println("\"");
  const uint32_t promptStarted = millis();
  bool prompt = false;
  while (millis() - promptStarted < 5000) {
    if (gsmSerial.available() && gsmSerial.read() == '>') {
      prompt = true;
      break;
    }
    delay(10);
  }
  if (!prompt) return "failed";

  gsmSerial.print("Possible accident detected by helmet ");
  gsmSerial.print(DEVICE_ID);
  gsmSerial.print(". Alert ");
  gsmSerial.print(alertId);
  if (gpsValid) {
    gsmSerial.print(". Location: https://maps.google.com/?q=");
    gsmSerial.print(latitude, 6);
    gsmSerial.print(",");
    gsmSerial.print(longitude, 6);
  } else {
    gsmSerial.print(". GPS location unavailable.");
  }
  gsmSerial.write(26);

  String response;
  const uint32_t sentAt = millis();
  while (millis() - sentAt < 60000) {
    while (gsmSerial.available()) {
      response += static_cast<char>(gsmSerial.read());
      if (response.indexOf("+CMGS:") >= 0 && response.indexOf("OK") >= 0) return "unknown";
      if (response.indexOf("ERROR") >= 0) return "failed";
    }
    delay(25);
  }
  return "unknown";
}

void publishAlert(float impactG) {
  if (!pendingAlertId.isEmpty()) {
    Serial.println("An earlier alert is still pending; this impact was not queued.");
    return;
  }
  const String alertId = String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX) + "_" +
                         String(millis(), HEX);
  const bool gpsValid = hasFreshGpsFix();
  const double latitude = gpsValid ? gps.location.lat() : 0.0;
  const double longitude = gpsValid ? gps.location.lng() : 0.0;
  const String timestamp = currentTimestamp();
  if (timestamp.isEmpty()) {
    Serial.println("Clock is not synchronized; cannot create a valid alert.");
    return;
  }

  JsonDocument alert;
  alert["timestamp"] = timestamp;
  alert["severity"] = impactG >= 4.0f ? "high" : "medium";
  if (gpsValid) {
    alert["latitude"] = latitude;
    alert["longitude"] = longitude;
  }
  alert["gpsValid"] = gpsValid;
  alert["status"] = "new";
  alert["smsStatus"] = "pending";
  alert["deviceId"] = DEVICE_ID;

  String alertJson;
  serializeJson(alert, alertJson);
  savePendingAlert(alertId, alertJson);
  processPendingAlert();
}

void processPendingAlert() {
  if (pendingAlertId.isEmpty()) return;

  const String alertPath = String("alerts/") + DEVICE_ID + "/" + pendingAlertId;
  if (pendingAlertStage == 0) {
    String existing;
    if (!firebaseRead(alertPath, existing)) return;
    existing.trim();
    if (existing == "null") {
      JsonDocument alert;
      if (deserializeJson(alert, pendingAlertJson)) {
        Serial.println("Queued alert JSON is invalid; retaining it for inspection.");
        return;
      }
      if (!firebaseWrite(alertPath, alert, "PUT")) return;
      Serial.printf("Alert %s created in Firebase.\n", pendingAlertId.c_str());
    } else {
      JsonDocument existingAlert;
      if (deserializeJson(existingAlert, existing) || !existingAlert.is<JsonObject>()) {
        Serial.println("Firebase returned invalid data for a queued alert.");
        return;
      }
      Serial.printf("Found previously uploaded alert %s.\n", pendingAlertId.c_str());
    }
    pendingAlertStage = 1;
    preferences.putUChar(PENDING_ALERT_STAGE_KEY, pendingAlertStage);
  }

  if (pendingAlertStage == 1) {
    JsonDocument alert;
    if (deserializeJson(alert, pendingAlertJson)) return;
    const bool gpsValid = alert["gpsValid"] | false;
    const double latitude = alert["latitude"] | 0.0;
    const double longitude = alert["longitude"] | 0.0;

    // Persist before the send so reboot recovery will not send the same SMS twice.
    pendingAlertStage = 2;
    preferences.putUChar(PENDING_ALERT_STAGE_KEY, pendingAlertStage);
    pendingAlertSmsStatus = sendEmergencySms(pendingAlertId, gpsValid, latitude, longitude);
    preferences.putString(PENDING_ALERT_SMS_KEY, pendingAlertSmsStatus);
  }

  if (pendingAlertStage == 2) {
    if (pendingAlertSmsStatus.isEmpty()) pendingAlertSmsStatus = "unknown";
    JsonDocument smsUpdate;
    smsUpdate["smsStatus"] = pendingAlertSmsStatus;
    if (!firebaseWrite(alertPath, smsUpdate)) {
      Serial.println("Could not update queued alert SMS status; will retry.");
      return;
    }
    clearPendingAlert();
  }
}

void publishTelemetry(float impactG) {
  const String timestamp = currentTimestamp();
  if (timestamp.isEmpty()) {
    Serial.println("Clock is not synchronized; telemetry skipped.");
    return;
  }
  const bool gpsValid = hasFreshGpsFix();
  if (gpsValid && lastGpsFixAt == 0) lastGpsFixAt = time(nullptr);
  const bool warning = impactG >= WARNING_THRESHOLD_G;
  JsonDocument telemetry;
  telemetry["deviceId"] = DEVICE_ID;
  telemetry["helmetStatus"] = "connected";
  telemetry["accidentStatus"] = impactG >= IMPACT_THRESHOLD_G ? "alert" : (warning ? "warning" : "normal");
  if (gpsValid) {
    telemetry["latitude"] = gps.location.lat();
    telemetry["longitude"] = gps.location.lng();
  } else {
    telemetry["latitude"] = nullptr;
    telemetry["longitude"] = nullptr;
  }
  telemetry["gpsValid"] = gpsValid;
  telemetry["gpsLastFixAt"] = lastGpsFixAt ? isoTimestamp(lastGpsFixAt) : String();
  telemetry["gsmRegistered"] = gsmRegistered;
  telemetry["mpuOk"] = mpuOk;
  telemetry["batteryLevel"] = nullptr;
  telemetry["alcoholDetected"] = nullptr;
  telemetry["lastUpdated"] = timestamp;

  if (firebaseWrite(String("devices/") + DEVICE_ID, telemetry)) {
    Serial.printf("Telemetry sent; impact %.2f g, GPS %s, GSM %s.\n", impactG,
                  gpsValid ? "valid" : "searching", gsmRegistered ? "registered" : "offline");
  } else {
    Serial.println("Telemetry upload failed.");
  }
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 30000) {
    Serial.print('.');
    delay(500);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected: ");
    Serial.println(WiFi.localIP());
    if (!waitForClock()) Serial.println("NTP time sync failed; TLS/API calls may fail.");
  } else {
    Serial.println("Wi-Fi unavailable; will retry in loop.");
  }
}

void initializeGsm() {
  gsmSerial.begin(9600, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
  delay(1000);
  sendAtCommand("AT", "OK", 3000);
  sendAtCommand("ATE0", "OK", 2000);
  gsmRegistered = updateGsmRegistration();
  Serial.printf("SIM900A network registration: %s\n", gsmRegistered ? "registered" : "not registered");
}
}  // namespace

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(300000);
  delay(500);
  Serial.println("\nKavach ESP32 reference firmware starting.");

  if (String(WIFI_SSID).startsWith("YOUR_") ||
      String(FIREBASE_API_KEY).startsWith("YOUR_") ||
      String(FIREBASE_DATABASE_URL).indexOf("YOUR_PROJECT") >= 0 ||
      String(SMS_RECIPIENT_E164).indexOf("000000") >= 0) {
    Serial.println("Replace all placeholder values in config.h before use.");
    while (true) delay(1000);
  }
  if (strlen(FIREBASE_ROOT_CA) < 100) {
    Serial.println("Set FIREBASE_ROOT_CA in config.h to a valid CA certificate. HTTPS is fail-closed.");
    while (true) delay(1000);
  }
  if (!String(SMS_RECIPIENT_E164).startsWith("+")) {
    Serial.println("SMS_RECIPIENT_E164 must be an international-format number beginning with +.");
    while (true) delay(1000);
  }

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  mpuOk = mpu.begin();
  if (mpuOk) {
    mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    Serial.println("MPU6050 not detected on I2C.");
  }

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  initializeGsm();
  preferences.begin("kavach-auth", false);
  refreshToken = preferences.getString(REFRESH_TOKEN_KEY, "");
  pendingAlertId = preferences.getString(PENDING_ALERT_ID_KEY, "");
  pendingAlertJson = preferences.getString(PENDING_ALERT_JSON_KEY, "");
  pendingAlertStage = preferences.getUChar(PENDING_ALERT_STAGE_KEY, 0);
  pendingAlertSmsStatus = preferences.getString(PENDING_ALERT_SMS_KEY, "");
  connectWifi();
  if (WiFi.status() == WL_CONNECTED) ensureFirebaseToken();
}

void loop() {
  drainGps();
  if (WiFi.status() == WL_CONNECTED && !ntpConfigured) {
    if (!waitForClock()) Serial.println("NTP time sync pending.");
  }
  if (WiFi.status() != WL_CONNECTED) {
    static uint32_t lastWifiRetryAt = 0;
    if (millis() - lastWifiRetryAt >= 10000) {
      lastWifiRetryAt = millis();
      WiFi.reconnect();
    }
  }

  static uint32_t lastGsmCheckAt = 0;
  if (millis() - lastGsmCheckAt >= 30000) {
    lastGsmCheckAt = millis();
    gsmRegistered = updateGsmRegistration();
  }

  const float impactG = readAccelerationMagnitudeG();
  lastImpactG = impactG;
  if (mpuOk && impactG >= IMPACT_THRESHOLD_G &&
      (lastAlertAt == 0 || millis() - lastAlertAt >= ALERT_COOLDOWN_MS)) {
    lastAlertAt = millis();
    publishTelemetry(impactG);
    publishAlert(impactG);
  }

  if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = millis();
    publishTelemetry(lastImpactG);
  }
  if (!pendingAlertId.isEmpty() && millis() - lastAlertRetryAt >= ALERT_RETRY_INTERVAL_MS) {
    lastAlertRetryAt = millis();
    processPendingAlert();
  }
  delay(20);
}
