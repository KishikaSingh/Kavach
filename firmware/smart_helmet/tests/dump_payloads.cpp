// Prints the JSON the firmware really sends to Firebase, so the app tests can check it.
//   make fixtures   ->   ../frontend/tests/fixtures/firmware-payloads.json
#include <stdio.h>
#include "../payloads.h"

int main() {
  char dev[512], devNoGps[512], alertGps[512], alertNoGps[512], sent[128], confirmed[128], failed[128];
  DeviceSnapshot ok;
  ok.deviceId = "HELMET_001"; ok.level = AccidentLevel::Normal; ok.gpsValid = true;
  ok.latitude = 28.6692; ok.longitude = 77.4538; ok.gpsFixEpoch = 1791718920LL;
  ok.gsmRegistered = true; ok.mpuOk = true; ok.nowEpoch = 1791718925LL;
  buildDeviceJson(dev, sizeof(dev), ok);

  DeviceSnapshot noGps;
  noGps.deviceId = "HELMET_001"; noGps.level = AccidentLevel::Warning; noGps.gpsValid = false;
  noGps.latitude = 28.6; noGps.longitude = 77.4; noGps.gsmRegistered = true; noGps.mpuOk = true;
  noGps.nowEpoch = 1791718925LL;
  buildDeviceJson(devNoGps, sizeof(devNoGps), noGps);

  buildAlertCreateJson(alertGps, sizeof(alertGps), "2026-10-11T11:42:05Z", true, 28.6692, 77.4538);
  buildAlertCreateJson(alertNoGps, sizeof(alertNoGps), "2026-10-11T11:42:05Z", false, 0, 0);
  buildAlertPatchJson(sent, sizeof(sent), "sent", "pending");
  buildAlertPatchJson(confirmed, sizeof(confirmed), "sent", "confirmed");
  buildAlertPatchJson(failed, sizeof(failed), "new", "failed");

  printf("{\n  \"device\": %s,\n  \"deviceNoGps\": %s,\n  \"alertCreate\": %s,\n  \"alertCreateNoGps\": %s,\n"
         "  \"alertPatchSent\": %s,\n  \"alertPatchConfirmed\": %s,\n  \"alertPatchFailed\": %s\n}\n",
         dev, devNoGps, alertGps, alertNoGps, sent, confirmed, failed);
  return 0;
}
