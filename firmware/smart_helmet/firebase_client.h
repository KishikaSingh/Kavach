#pragma once
// Firebase Realtime Database over the REST API, signed in as the helmet's own Auth user.
// Used ONLY from the upload task (core 0): every call blocks while it talks to the network.
//
//   sign in : POST identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
//   refresh : POST securetoken.googleapis.com/v1/token
//   data    : <host>/<path>.json?auth=<idToken>   (PUT device, POST new alert, PATCH alert)
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "config.h"
#include "mini_json.h"

class FirebaseClient {
 public:
  // PUT /devices/{DEVICE_ID}
  bool putDevice(const char* json) {
    return send("PUT", String("/devices/") + DEVICE_ID, json, nullptr);
  }

  // POST /alerts/{DEVICE_ID} -> Firebase answers {"name":"<new id>"}
  bool createAlert(const char* json, char* idOut, size_t idSize) {
    String resp;
    if (!send("POST", String("/alerts/") + DEVICE_ID, json, &resp)) return false;
    return jsonGetString(resp.c_str(), "name", idOut, idSize) && idOut[0] != 0;
  }

  // PATCH /alerts/{DEVICE_ID}/{id}
  bool patchAlert(const char* id, const char* json) {
    return send("PATCH", String("/alerts/") + DEVICE_ID + "/" + id, json, nullptr);
  }

  bool signedIn() const { return haveToken_; }
  int lastHttpCode() const { return lastCode_; }

 private:
  void configureClient(WiFiClientSecure& c) {
#if USE_INSECURE_TLS
    c.setInsecure();
#else
    c.setCACert(FIREBASE_ROOT_CA);
#endif
  }

  // Token valid for at least another minute?
  bool tokenFresh() const {
    return haveToken_ && (int32_t)(millis() - tokenExpiresAtMs_) < 0;
  }

  // Makes sure idToken_ is usable: refresh if we can, otherwise sign in. Rate limited after failures.
  bool ensureToken() {
    if (tokenFresh()) return true;
    if (authFailed_ && (uint32_t)(millis() - lastAuthAttemptMs_) < 10000) return false;
    lastAuthAttemptMs_ = millis();
    bool ok = false;
    if (refreshToken_[0] != 0) ok = refresh();
    if (!ok) ok = signIn();
    authFailed_ = !ok;
    return ok;
  }

  bool signIn() {
    String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=") + FIREBASE_API_KEY;
    String body = String("{\"email\":\"") + DEVICE_EMAIL + "\",\"password\":\"" + DEVICE_PASSWORD + "\",\"returnSecureToken\":true}";
    String resp;
    int code = rawRequest("POST", url, body.c_str(), "application/json", &resp);
    if (code != 200) { logAuthError("sign-in", code, resp); return false; }
    return storeTokens(resp.c_str(), "idToken", "refreshToken", "expiresIn");
  }

  bool refresh() {
    String url = String("https://securetoken.googleapis.com/v1/token?key=") + FIREBASE_API_KEY;
    String body = String("grant_type=refresh_token&refresh_token=") + refreshToken_;
    String resp;
    int code = rawRequest("POST", url, body.c_str(), "application/x-www-form-urlencoded", &resp);
    if (code != 200) {
      logAuthError("token refresh", code, resp);
      refreshToken_[0] = 0;          // fall back to a full sign-in next
      return false;
    }
    return storeTokens(resp.c_str(), "id_token", "refresh_token", "expires_in");
  }

  bool storeTokens(const char* json, const char* idKey, const char* refreshKey, const char* expKey) {
    if (!jsonGetString(json, idKey, idToken_, sizeof(idToken_))) return false;
    jsonGetString(json, refreshKey, refreshToken_, sizeof(refreshToken_));
    long expiresIn = 3600;
    jsonGetLong(json, expKey, &expiresIn);
    if (expiresIn < 120) expiresIn = 120;
    tokenExpiresAtMs_ = millis() + (uint32_t)(expiresIn - 60) * 1000UL;
    haveToken_ = true;
    return true;
  }

  void logAuthError(const char* what, int code, const String& resp) {
    char msg[64] = "";
    jsonGetString(resp.c_str(), "message", msg, sizeof(msg));
    Serial.printf("[firebase] %s failed: HTTP %d %s\n", what, code, msg);
  }

  // One HTTPS request. Returns the HTTP status, or a negative HTTPClient error.
  int rawRequest(const char* method, const String& url, const char* body, const char* contentType, String* response) {
    WiFiClientSecure client;
    configureClient(client);
    HTTPClient http;
    http.setTimeout(8000);
    http.setConnectTimeout(8000);
    if (!http.begin(client, url)) return -1;
    http.addHeader("Content-Type", contentType);
    int code = http.sendRequest(method, (uint8_t*)body, strlen(body));
    if (response && code > 0) *response = http.getString();
    http.end();
    return code;
  }

  // Authenticated database request. A 401 means the token is no longer accepted: drop it so the
  // next attempt signs in again.
  bool send(const char* method, const String& path, const char* body, String* response) {
    if (WiFi.status() != WL_CONNECTED) return false;
    if (!ensureToken()) return false;
    String url = String("https://") + FIREBASE_HOST + path + ".json?auth=" + idToken_;
    String resp;
    int code = rawRequest(method, url, body, "application/json", &resp);
    lastCode_ = code;
    if (code == 401) {
      haveToken_ = false;
      Serial.println("[firebase] 401: token rejected or database rules deny this write");
      return false;
    }
    if (code < 200 || code >= 300) {
      Serial.printf("[firebase] %s failed: HTTP %d\n", method, code);
      return false;
    }
    if (response) *response = resp;
    return true;
  }

  char idToken_[1536] = {0};
  char refreshToken_[512] = {0};
  bool haveToken_ = false;
  bool authFailed_ = false;
  uint32_t tokenExpiresAtMs_ = 0;
  uint32_t lastAuthAttemptMs_ = 0;
  int lastCode_ = 0;
};
