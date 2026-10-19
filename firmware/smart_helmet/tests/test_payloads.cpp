#include "test_framework.h"
#include "../payloads.h"
#include "../mini_json.h"
#include "../alert_sync.h"

static void test_formatIso() {
  char b[32];
  CHECK(formatIso(1577836800LL, b, sizeof(b))); CHECK_STR(b, "2020-01-01T00:00:00Z");
  CHECK(formatIso(1709164800LL, b, sizeof(b))); CHECK_STR(b, "2024-02-29T00:00:00Z");   // leap day
  CHECK(formatIso(1735689599LL, b, sizeof(b))); CHECK_STR(b, "2024-12-31T23:59:59Z");
  CHECK(formatIso(1791718925LL, b, sizeof(b)));        CHECK_STR(b, "2026-10-11T11:42:05Z");
  CHECK(!formatIso(0, b, sizeof(b)));            CHECK_STR(b, "");                      // clock never set
  CHECK(!formatIso(1577836800LL, b, 10));                                              // buffer too small
}

static void test_device_json_healthy() {
  DeviceSnapshot s;
  s.deviceId = "HELMET_001"; s.level = AccidentLevel::Normal; s.gpsValid = true;
  s.latitude = 28.6692; s.longitude = 77.4538; s.gpsFixEpoch = 1791718925LL - 5; s.gsmRegistered = true;
  s.mpuOk = true; s.nowEpoch = 1791718925LL;
  char j[512];
  int n = buildDeviceJson(j, sizeof(j), s);
  CHECK(n > 0);
  CHECK_STR(j, "{\"deviceId\":\"HELMET_001\",\"helmetStatus\":\"connected\",\"accidentStatus\":\"normal\","
               "\"latitude\":28.669200,\"longitude\":77.453800,\"gpsValid\":true,\"gpsLastFixAt\":\"2026-10-11T11:42:00Z\","
               "\"gsmRegistered\":true,\"mpuOk\":true,\"batteryLevel\":null,\"alcoholDetected\":null,"
               "\"lastUpdated\":\"2026-10-11T11:42:05Z\"}");
}

static void test_device_json_no_gps_has_null_coordinates() {
  DeviceSnapshot s;
  s.gpsValid = false; s.latitude = 28.6; s.longitude = 77.4;      // stale values must NOT leak out
  s.gpsFixEpoch = 0; s.nowEpoch = 1791718925LL; s.level = AccidentLevel::Warning; s.mpuOk = false;
  char j[512];
  buildDeviceJson(j, sizeof(j), s);
  CHECK(strstr(j, "\"latitude\":null,\"longitude\":null,\"gpsValid\":false,\"gpsLastFixAt\":null") != nullptr);
  CHECK(strstr(j, "\"accidentStatus\":\"warning\"") != nullptr);
  CHECK(strstr(j, "\"mpuOk\":false") != nullptr);
  CHECK(strstr(j, "\"gsmRegistered\":false") != nullptr);
  DeviceSnapshot bad; bad.gpsValid = true; bad.latitude = NAN; bad.longitude = 10; bad.nowEpoch = 0;
  buildDeviceJson(j, sizeof(j), bad);
  CHECK(strstr(j, "\"latitude\":null") != nullptr && strstr(j, "\"gpsValid\":false") != nullptr);
  CHECK(strstr(j, "\"lastUpdated\":null") != nullptr);             // clock not set
  CHECK(buildDeviceJson(j, 20, s) == -1);                          // too small
}

static void test_alert_json_and_sms_text() {
  char j[300];
  buildAlertCreateJson(j, sizeof(j), "2026-10-11T11:42:05Z", true, 28.6692, 77.4538);
  CHECK_STR(j, "{\"timestamp\":\"2026-10-11T11:42:05Z\",\"severity\":\"high\",\"latitude\":28.669200,\"longitude\":77.453800,"
               "\"gpsValid\":true,\"status\":\"new\",\"smsStatus\":\"pending\"}");
  buildAlertCreateJson(j, sizeof(j), "2026-10-11T11:42:05Z", false, 1, 2);
  CHECK(strstr(j, "\"latitude\":null,\"longitude\":null,\"gpsValid\":false") != nullptr);
  buildAlertPatchJson(j, sizeof(j), "sent", "confirmed");
  CHECK_STR(j, "{\"status\":\"sent\",\"smsStatus\":\"confirmed\"}");

  char t[200];
  buildSmsText(t, sizeof(t), true, 28.6692, 77.4538);
  CHECK(strstr(t, "https://maps.google.com/?q=28.669200,77.453800") != nullptr);
  CHECK(strlen(t) < 160);
  buildSmsText(t, sizeof(t), false, 0, 0);
  CHECK(strstr(t, "GPS location unavailable") != nullptr);
  CHECK(strstr(t, "maps.google") == nullptr);
}

static void test_sms_status_combination() {
  using R = NumberResult;
  { R a[] = {R::Pending}; CHECK_STR(combineSmsStatus(a, 1), "pending"); }
  { R a[] = {R::Delivered}; CHECK_STR(combineSmsStatus(a, 1), "confirmed"); }
  { R a[] = {R::Failed}; CHECK_STR(combineSmsStatus(a, 1), "failed"); }
  { R a[] = {R::Unknown}; CHECK_STR(combineSmsStatus(a, 1), "unknown"); }
  { R a[] = {R::Failed, R::Delivered}; CHECK_STR(combineSmsStatus(a, 2), "confirmed"); }   // one got through
  { R a[] = {R::Failed, R::Pending}; CHECK_STR(combineSmsStatus(a, 2), "pending"); }
  { R a[] = {R::Failed, R::Failed}; CHECK_STR(combineSmsStatus(a, 2), "failed"); }
  { R a[] = {R::Failed, R::Unknown}; CHECK_STR(combineSmsStatus(a, 2), "unknown"); }
  using S = SendState; using D = DeliveryState;
  CHECK(numberResultFrom(S::Accepted, D::Delivered) == NumberResult::Delivered);
  CHECK(numberResultFrom(S::Accepted, D::Failed) == NumberResult::Failed);
  CHECK(numberResultFrom(S::Accepted, D::Unknown) == NumberResult::Unknown);
  CHECK(numberResultFrom(S::Accepted, D::Waiting) == NumberResult::Pending);   // accepted is NOT delivered
  CHECK(numberResultFrom(S::Failed, D::None) == NumberResult::Failed);
  CHECK(numberResultFrom(S::NoResponse, D::None) == NumberResult::Unknown);
  CHECK(numberResultFrom(S::WaitPrompt, D::None) == NumberResult::Pending);
  CHECK(numberResultFrom(S::WaitResult, D::None) == NumberResult::Pending);
  CHECK(numberResultFrom(S::Idle, D::None) == NumberResult::Pending);
}

static void test_mini_json() {
  const char* signin = "{\n \"kind\": \"identitytoolkit#VerifyPasswordResponse\",\n \"idToken\": \"abc.def.ghi\",\n"
                       " \"refreshToken\": \"AMf-vB\\/xyz\",\n \"expiresIn\": \"3600\",\n \"localId\": \"u1\"\n}";
  char b[64]; long v = 0;
  CHECK(jsonGetString(signin, "idToken", b, sizeof(b))); CHECK_STR(b, "abc.def.ghi");
  CHECK(jsonGetString(signin, "refreshToken", b, sizeof(b))); CHECK_STR(b, "AMf-vB/xyz");
  CHECK(jsonGetLong(signin, "expiresIn", &v)); CHECK(v == 3600);
  CHECK(!jsonGetString(signin, "missing", b, sizeof(b)));
  CHECK(!jsonGetString(signin, "idToken", b, 5));                    // does not fit
  CHECK(jsonGetString("{\"name\":\"-NxAbC123\"}", "name", b, sizeof(b))); CHECK_STR(b, "-NxAbC123");
  CHECK(jsonGetLong("{\"expires_in\": 3599}", "expires_in", &v) && v == 3599);
  CHECK(!jsonGetString("{\"error\":{\"message\":\"INVALID_PASSWORD\"}}", "idToken", b, sizeof(b)));
  CHECK(jsonGetString("{\"error\":{\"message\":\"INVALID_PASSWORD\"}}", "message", b, sizeof(b))); CHECK_STR(b, "INVALID_PASSWORD");
  CHECK(!jsonGetString(nullptr, "x", b, sizeof(b)));
}

static void test_alert_sync_offline_then_online() {
  AlertSync s;
  CHECK(s.nextOp(0, 5000) == SyncOp::None);
  s.begin(120000, true, 28.6692, 77.4538);
  CHECK(s.active() && s.needsTimestamp());
  CHECK(s.nextOp(1000, 5000) == SyncOp::None);          // clock not set yet: cannot create
  // the SMS gets accepted while still offline
  s.setStatus("sent", "pending");
  s.setTimestamp("2026-10-11T11:42:05Z");
  CHECK(s.nextOp(2000, 5000) == SyncOp::Create);
  uint32_t g = s.generation();
  s.onFail(g, 2000);                                    // upload failed
  CHECK(s.nextOp(3000, 5000) == SyncOp::None);          // waits for the retry interval
  CHECK(s.nextOp(7000, 5000) == SyncOp::Create);
  s.onCreateOk(g, "-NxAbC");
  CHECK(s.nextOp(7100, 5000) == SyncOp::Patch);         // catches up with the newer status
  s.onPatchOk(g, "sent", "pending");
  CHECK(s.nextOp(7200, 5000) == SyncOp::None);
  s.setStatus("sent", "confirmed");
  CHECK(s.nextOp(7300, 5000) == SyncOp::Patch);
  s.setStatus("sent", "unknown");                       // status moves on WHILE the upload is in flight
  s.onPatchOk(g, "sent", "confirmed");
  CHECK(s.nextOp(7400, 5000) == SyncOp::Patch);         // the newer value is still uploaded
  s.onPatchOk(g, "sent", "unknown");
  CHECK(!s.active());
  CHECK_STR(s.record().remoteId, "-NxAbC");
  s.begin(500000, false, 0, 0);                         // a later accident starts fresh
  CHECK(!s.record().created && !s.record().gpsValid);
  CHECK(s.nextOp(500000, 5000) == SyncOp::None);        // timestamp still missing
  s.onCreateOk(g, "-OLD");                              // late answer for the OLD alert: ignored
  CHECK(!s.record().created && s.record().remoteId[0] == 0);
  s.onFail(g, 500100);
  s.setTimestamp("2026-10-11T12:00:00Z");
  CHECK(s.nextOp(500200, 5000) == SyncOp::Create);      // the old failure did not delay the new alert
}

int main() {
  RUN(test_formatIso);
  RUN(test_device_json_healthy);
  RUN(test_device_json_no_gps_has_null_coordinates);
  RUN(test_alert_json_and_sms_text);
  RUN(test_sms_status_combination);
  RUN(test_mini_json);
  RUN(test_alert_sync_offline_then_online);
  TEST_MAIN_END();
}
