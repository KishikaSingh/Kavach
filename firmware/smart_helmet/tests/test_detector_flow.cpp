#include "test_framework.h"
#include "../accident_detector.h"
#include "../alert_flow.h"

static void test_normal_riding_never_triggers() {
  AccidentDetector d;
  bool any = false;
  for (uint32_t t = 0; t < 60000; t += 10) any |= d.update(1.0f + 0.3f * ((t / 10) % 3), t); // 1.0 - 1.6 g
  CHECK(!any);
  CHECK(!d.warningActive(60000));
}

static void test_single_spike_is_debounced() {
  AccidentDetector d;
  CHECK(!d.update(1.0f, 0));
  CHECK(!d.update(6.0f, 10));   // one bump
  CHECK(!d.update(1.0f, 20));
  CHECK(!d.update(6.0f, 30));   // not consecutive
  CHECK(!d.update(6.0f, 40));
  CHECK(!d.update(1.0f, 50));
}

static void test_sustained_impact_triggers_once_then_cooldown() {
  AccidentDetector d;
  CHECK(!d.update(4.0f, 100));
  CHECK(!d.update(4.5f, 110));
  CHECK(d.update(5.0f, 120));          // third consecutive sample triggers
  CHECK(!d.update(5.0f, 130));         // cooldown
  CHECK(!d.update(5.0f, 59000));       // still within 60 s
  CHECK(d.inCooldown(59000));
  uint32_t after = 120 + 60000;
  CHECK(!d.update(4.0f, after));       // first sample after cooldown starts a new run
  CHECK(!d.update(4.0f, after + 10));
  CHECK(d.update(4.0f, after + 20));   // triggers again
}

static void test_warning_level_and_hold() {
  AccidentDetector d;
  CHECK(!d.warningActive(0));
  d.update(2.5f, 1000);                // above warn, below impact
  CHECK(d.warningActive(1000));
  CHECK(d.warningActive(5000));
  CHECK(!d.warningActive(6500));       // hold time over
}

static void test_garbage_samples_ignored() {
  AccidentDetector d;
  d.update(4.0f, 0); d.update(4.0f, 10);
  CHECK(!d.update(NAN, 20));           // glitch resets the run
  CHECK(!d.update(4.0f, 30));
  CHECK(!d.update(400.0f, 40));        // beyond sensor range
  CHECK(!d.update(-1.0f, 50));
  CHECK(!d.update(4.0f, 60));
}

static void test_configurable_threshold() {
  AccidentDetector d;
  d.setImpactThreshold(6.0f);
  CHECK(!d.update(5.0f, 0)); CHECK(!d.update(5.0f, 10)); CHECK(!d.update(5.0f, 20));
  CHECK(!d.update(6.5f, 30)); CHECK(!d.update(6.5f, 40));
  CHECK(d.update(6.5f, 50));
}

static void test_millis_wraparound() {
  AccidentDetector d;
  uint32_t t = 0xFFFFFFF0u;
  d.update(4.0f, t); d.update(4.0f, t + 5);
  CHECK(d.update(4.0f, t + 10));       // t+10 wraps past zero
  CHECK(d.inCooldown(t + 20));
  CHECK(!d.update(4.0f, t + 25));
}

static void test_flow_cancel_window_cancel() {
  AlertFlow f(10000, 8000);
  CHECK(f.state() == FlowState::Idle);
  CHECK(f.onAccident(1000));
  CHECK(!f.onAccident(1100));          // already running
  CHECK(f.state() == FlowState::CancelWindow);
  CHECK(f.cancelSecondsLeft(1000) == 10);
  CHECK(f.update(5000) == FlowEvent::None);
  CHECK(f.buzzerOn(1000));             // fast beeping starts on
  CHECK(!f.buzzerOn(1200));
  CHECK(f.onCancelPressed());
  CHECK(f.state() == FlowState::Idle);
  CHECK(f.wasCancelled());
  CHECK(!f.buzzerOn(1300));
  CHECK(f.update(20000) == FlowEvent::None); // no SMS after cancel
  CHECK(!f.onCancelPressed());         // nothing left to cancel
}

static void test_flow_sends_after_window_and_cannot_cancel_while_sending() {
  AlertFlow f(10000, 8000);
  f.onAccident(0);
  CHECK(f.update(9999) == FlowEvent::None);
  CHECK(f.update(10000) == FlowEvent::SendNow);
  CHECK(f.state() == FlowState::Sending);
  CHECK(f.update(10010) == FlowEvent::None);   // SendNow only once
  CHECK(!f.onCancelPressed());                 // too late to cancel
  CHECK(!f.onAccident(10020));                 // no second flow while busy
  f.onSendingFinished(15000);
  CHECK(f.state() == FlowState::Done);
  CHECK(f.update(22999) == FlowEvent::None && f.state() == FlowState::Done);
  CHECK(f.update(23000) == FlowEvent::None && f.state() == FlowState::Idle);
  CHECK(f.onAccident(30000));                  // a new accident works afterwards
}

int main() {
  RUN(test_normal_riding_never_triggers);
  RUN(test_single_spike_is_debounced);
  RUN(test_sustained_impact_triggers_once_then_cooldown);
  RUN(test_warning_level_and_hold);
  RUN(test_garbage_samples_ignored);
  RUN(test_configurable_threshold);
  RUN(test_millis_wraparound);
  RUN(test_flow_cancel_window_cancel);
  RUN(test_flow_sends_after_window_and_cannot_cancel_while_sending);
  TEST_MAIN_END();
}
