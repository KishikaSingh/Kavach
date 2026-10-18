#pragma once
// JSON and SMS text builders. Field names and values follow the FROZEN Firebase layout:
//   /devices/{deviceId}            device fields
//   /alerts/{deviceId}/{alertId}   alert fields (status new|sent|resolved, smsStatus pending|confirmed|failed|unknown)
// Unknown values are written as null, never invented. Pure logic, tested on a PC.
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <math.h>

enum class AccidentLevel : uint8_t { Normal, Warning, Alert };

inline const char* accidentLevelString(AccidentLevel l) {
  switch (l) {
    case AccidentLevel::Warning: return "warning";
    case AccidentLevel::Alert:   return "alert";
    default:                     return "normal";
  }
}

// Epoch seconds before 2020-01-01 mean "the clock was never set".
inline bool epochLooksValid(int64_t epoch) { return epoch >= 1577836800LL; }

// "2026-10-11T11:42:05Z" (UTC). Returns false and writes "" if the epoch is not valid.
inline bool formatIso(int64_t epoch, char* out, size_t n) {
  if (n < 21 || !epochLooksValid(epoch)) { if (n) out[0] = 0; return false; }
  int64_t days = epoch / 86400;
  int64_t secs = epoch % 86400;
  // civil_from_days (Howard Hinnant)
  int64_t z = days + 719468;
  int64_t era = (z >= 0 ? z : z - 146096) / 146097;
  int64_t doe = z - era * 146097;
  int64_t yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
  int64_t y = yoe + era * 400;
  int64_t doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  int64_t mp = (5 * doy + 2) / 153;
  int64_t d = doy - (153 * mp + 2) / 5 + 1;
  int64_t m = mp < 10 ? mp + 3 : mp - 9;
  if (m <= 2) y++;
  snprintf(out, n, "%04d-%02d-%02dT%02d:%02d:%02dZ", (int)y, (int)m, (int)d,
           (int)(secs / 3600), (int)((secs % 3600) / 60), (int)(secs % 60));
  return true;
}

struct DeviceSnapshot {
  const char* deviceId = "HELMET_001";
  AccidentLevel level = AccidentLevel::Normal;
  bool gpsValid = false;        // a FRESH, valid GPS fix right now
  double latitude = 0, longitude = 0;
  int64_t gpsFixEpoch = 0;      // time of the last valid fix (0 = never)
  bool gsmRegistered = false;
  bool mpuOk = false;
  int64_t nowEpoch = 0;         // current time (0 = clock not set)
};

inline bool coordsUsable(bool gpsValid, double lat, double lon) {
  return gpsValid && isfinite(lat) && isfinite(lon) && fabs(lat) <= 90.0 && fabs(lon) <= 180.0;
}

// Writes the /devices/{deviceId} object. Returns the length, or -1 if the buffer is too small.
inline int buildDeviceJson(char* out, size_t n, const DeviceSnapshot& s) {
  char fix[24], now[24], lat[24], lon[24];
  bool haveFix = formatIso(s.gpsFixEpoch, fix, sizeof(fix));
  bool haveNow = formatIso(s.nowEpoch, now, sizeof(now));
  bool coords = coordsUsable(s.gpsValid, s.latitude, s.longitude);
  if (coords) { snprintf(lat, sizeof(lat), "%.6f", s.latitude); snprintf(lon, sizeof(lon), "%.6f", s.longitude); }
  else { strcpy(lat, "null"); strcpy(lon, "null"); }

  int len = snprintf(out, n,
    "{\"deviceId\":\"%s\",\"helmetStatus\":\"connected\",\"accidentStatus\":\"%s\","
    "\"latitude\":%s,\"longitude\":%s,\"gpsValid\":%s,\"gpsLastFixAt\":%s%s%s,"
    "\"gsmRegistered\":%s,\"mpuOk\":%s,\"batteryLevel\":null,\"alcoholDetected\":null,"
    "\"lastUpdated\":%s%s%s}",
    s.deviceId, accidentLevelString(s.level),
    lat, lon, coords ? "true" : "false",
    haveFix ? "\"" : "", haveFix ? fix : "null", haveFix ? "\"" : "",
    s.gsmRegistered ? "true" : "false", s.mpuOk ? "true" : "false",
    haveNow ? "\"" : "", haveNow ? now : "null", haveNow ? "\"" : "");
  return (len < 0 || (size_t)len >= n) ? -1 : len;
}

// New alert record: status "new", smsStatus "pending". timestampIso must be a valid ISO string.
inline int buildAlertCreateJson(char* out, size_t n, const char* timestampIso, bool gpsValid, double lat, double lon) {
  bool coords = coordsUsable(gpsValid, lat, lon);
  char la[24], lo[24];
  if (coords) { snprintf(la, sizeof(la), "%.6f", lat); snprintf(lo, sizeof(lo), "%.6f", lon); }
  else { strcpy(la, "null"); strcpy(lo, "null"); }
  int len = snprintf(out, n,
    "{\"timestamp\":\"%s\",\"severity\":\"high\",\"latitude\":%s,\"longitude\":%s,"
    "\"gpsValid\":%s,\"status\":\"new\",\"smsStatus\":\"pending\"}",
    timestampIso, la, lo, coords ? "true" : "false");
  return (len < 0 || (size_t)len >= n) ? -1 : len;
}

inline int buildAlertPatchJson(char* out, size_t n, const char* status, const char* smsStatus) {
  int len = snprintf(out, n, "{\"status\":\"%s\",\"smsStatus\":\"%s\"}", status, smsStatus);
  return (len < 0 || (size_t)len >= n) ? -1 : len;
}

// Emergency SMS text (kept under 160 characters). Coordinates only when the fix is valid.
inline int buildSmsText(char* out, size_t n, bool gpsValid, double lat, double lon) {
  int len;
  if (coordsUsable(gpsValid, lat, lon)) {
    len = snprintf(out, n, "EMERGENCY: possible accident detected by Smart Helmet. Location: https://maps.google.com/?q=%.6f,%.6f", lat, lon);
  } else {
    len = snprintf(out, n, "EMERGENCY: possible accident detected by Smart Helmet. GPS location unavailable.");
  }
  return (len < 0 || (size_t)len >= n) ? -1 : len;
}

// ---- Combining the SMS outcome of several recipients into one smsStatus ----
enum class NumberResult : uint8_t { Pending, Delivered, Failed, Unknown };

// confirmed: at least one recipient has a delivery report saying delivered.
// pending:   nobody confirmed yet and at least one is still in progress.
// failed:    every recipient failed.
// unknown:   anything else (e.g. accepted by the network but no delivery report).
inline const char* combineSmsStatus(const NumberResult* r, int n) {
  bool anyDelivered = false, anyPending = false, allFailed = n > 0;
  for (int i = 0; i < n; i++) {
    if (r[i] == NumberResult::Delivered) anyDelivered = true;
    if (r[i] == NumberResult::Pending) anyPending = true;
    if (r[i] != NumberResult::Failed) allFailed = false;
  }
  if (anyDelivered) return "confirmed";
  if (anyPending) return "pending";
  if (allFailed) return "failed";
  return "unknown";
}
