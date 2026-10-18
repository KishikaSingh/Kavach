#pragma once
// Keeps ONE alert record in step with Firebase, surviving Wi-Fi outages: the alert is created
// on the server as soon as the network allows, then status/smsStatus changes are patched.
// The accident time is stored as device uptime and converted to a real timestamp later,
// because the clock may not be set yet when the accident happens.
// Not thread-safe by itself: the sketch locks around calls. Pure logic, tested on a PC.
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include "sim800.h"
#include "payloads.h"

enum class SyncOp : uint8_t { None, Create, Patch };

struct AlertRecord {
  bool used = false;
  uint32_t eventUptimeMs = 0;
  char timestampIso[24] = {0};     // filled once the clock is known
  bool gpsValid = false;
  double latitude = 0, longitude = 0;
  char status[12] = "new";         // new | sent | resolved
  char smsStatus[12] = "pending";  // pending | confirmed | failed | unknown
  char remoteId[48] = {0};
  bool created = false;
};

class AlertSync {
 public:
  // Start a new alert (called when the cancel window has expired). Replaces any finished one.
  void begin(uint32_t eventUptimeMs, bool gpsValid, double lat, double lon) {
    rec_ = AlertRecord();
    rec_.used = true;
    rec_.eventUptimeMs = eventUptimeMs;
    rec_.gpsValid = coordsUsable(gpsValid, lat, lon);
    rec_.latitude = rec_.gpsValid ? lat : 0;
    rec_.longitude = rec_.gpsValid ? lon : 0;
    createDirty_ = true;
    patchDirty_ = false;
    attempted_ = false;
    generation_++;
  }

  // Identifies the current alert. The upload task passes it back with the result, so a result
  // that arrives after a NEW alert was started is ignored instead of landing on the wrong record.
  uint32_t generation() const { return generation_; }

  bool active() const { return rec_.used && (createDirty_ || patchDirty_); }
  bool hasAlert() const { return rec_.used; }
  const AlertRecord& record() const { return rec_; }
  bool needsTimestamp() const { return rec_.used && !rec_.created && rec_.timestampIso[0] == 0; }

  void setTimestamp(const char* iso) { snprintf(rec_.timestampIso, sizeof(rec_.timestampIso), "%s", iso); }

  // Update status fields; marks a patch as needed only if something changed.
  void setStatus(const char* status, const char* smsStatus) {
    if (!rec_.used) return;
    bool changed = strcmp(rec_.status, status) != 0 || strcmp(rec_.smsStatus, smsStatus) != 0;
    snprintf(rec_.status, sizeof(rec_.status), "%s", status);
    snprintf(rec_.smsStatus, sizeof(rec_.smsStatus), "%s", smsStatus);
    // Not created yet: nothing to patch. onCreateOk() patches afterwards if the status moved on.
    if (changed && rec_.created) patchDirty_ = true;
  }

  // What should the upload task do next? Honours the retry interval after a failure.
  SyncOp nextOp(uint32_t nowMs, uint32_t retryMs) {
    if (!rec_.used) return SyncOp::None;
    if (attempted_ && (uint32_t)(nowMs - lastAttemptMs_) < retryMs) return SyncOp::None;
    if (!rec_.created) {
      if (!createDirty_ || rec_.timestampIso[0] == 0) return SyncOp::None;
      return SyncOp::Create;
    }
    return patchDirty_ ? SyncOp::Patch : SyncOp::None;
  }

  void onCreateOk(uint32_t gen, const char* remoteId) {
    if (gen != generation_ || !rec_.used) return;
    snprintf(rec_.remoteId, sizeof(rec_.remoteId), "%s", remoteId);
    rec_.created = true;
    createDirty_ = false;
    attempted_ = false;
    // Status may have moved on (e.g. "sent") while the create was waiting for Wi-Fi.
    patchDirty_ = (strcmp(rec_.status, "new") != 0 || strcmp(rec_.smsStatus, "pending") != 0);
  }
  // sentStatus/sentSms are the values that were uploaded. If the status moved on while the
  // request was in flight, the record stays dirty and the newer value is uploaded next.
  void onPatchOk(uint32_t gen, const char* sentStatus, const char* sentSms) {
    if (gen != generation_ || !rec_.used) return;
    attempted_ = false;
    patchDirty_ = strcmp(rec_.status, sentStatus) != 0 || strcmp(rec_.smsStatus, sentSms) != 0;
  }
  void onFail(uint32_t gen, uint32_t nowMs) {
    if (gen != generation_) return;
    attempted_ = true;
    lastAttemptMs_ = nowMs;
  }

 private:
  AlertRecord rec_;
  bool createDirty_ = false;
  bool patchDirty_ = false;
  bool attempted_ = false;
  uint32_t lastAttemptMs_ = 0;
  uint32_t generation_ = 0;
};

// Outcome of one recipient's SMS ticket. "Delivered" needs a delivery report; being accepted by
// the network is not enough.
inline NumberResult numberResultFrom(SendState s, DeliveryState d) {
  switch (s) {
    case SendState::Failed:      return NumberResult::Failed;
    case SendState::NoResponse:  return NumberResult::Unknown;
    case SendState::Accepted:
      if (d == DeliveryState::Delivered) return NumberResult::Delivered;
      if (d == DeliveryState::Failed)    return NumberResult::Failed;
      if (d == DeliveryState::Unknown)   return NumberResult::Unknown;
      return NumberResult::Pending;      // still waiting for the report
    default:                     return NumberResult::Pending;   // idle / prompt / result wait
  }
}
