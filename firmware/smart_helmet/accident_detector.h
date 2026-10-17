#pragma once
// Pure logic (no Arduino dependencies) so it can be tested on a PC.
#include <stdint.h>
#include <math.h>

struct DetectorConfig {
  float warnG = 2.0f;             // magnitude at which status shows "warning"
  float impactG = 3.5f;           // magnitude that counts as an impact sample
  uint8_t minConsecutive = 3;     // impact samples in a row needed to trigger (debounce)
  uint32_t cooldownMs = 60000;    // ignore new triggers for this long after one
  uint32_t warnHoldMs = 5000;     // how long "warning" stays visible after a spike
};

class AccidentDetector {
 public:
  explicit AccidentDetector(const DetectorConfig& c = DetectorConfig()) : cfg_(c) {}

  void setImpactThreshold(float g) { cfg_.impactG = g; }
  const DetectorConfig& config() const { return cfg_; }

  // Feed one acceleration magnitude sample (in g). Returns true exactly once per accident.
  bool update(float magG, uint32_t nowMs) {
    // Reject garbage readings (I2C glitches): NaN, negative, or beyond the sensor range.
    if (!(magG >= 0.0f) || magG > 20.0f || isnan(magG)) {
      consecutive_ = 0;
      return false;
    }
    if (magG >= cfg_.warnG) {
      lastWarnMs_ = nowMs;
      everWarned_ = true;
    }
    if (inCooldown(nowMs)) {
      consecutive_ = 0;
      return false;
    }
    if (magG >= cfg_.impactG) {
      if (consecutive_ < 255) consecutive_++;
    } else {
      consecutive_ = 0;
    }
    if (consecutive_ >= cfg_.minConsecutive) {
      consecutive_ = 0;
      triggered_ = true;
      lastTriggerMs_ = nowMs;
      return true;
    }
    return false;
  }

  // True for warnHoldMs after the last sample above the warning threshold.
  bool warningActive(uint32_t nowMs) const {
    return everWarned_ && (uint32_t)(nowMs - lastWarnMs_) <= cfg_.warnHoldMs;
  }

  bool inCooldown(uint32_t nowMs) const {
    return triggered_ && (uint32_t)(nowMs - lastTriggerMs_) < cfg_.cooldownMs;
  }

 private:
  DetectorConfig cfg_;
  uint8_t consecutive_ = 0;
  bool triggered_ = false;
  bool everWarned_ = false;
  uint32_t lastTriggerMs_ = 0;
  uint32_t lastWarnMs_ = 0;
};
