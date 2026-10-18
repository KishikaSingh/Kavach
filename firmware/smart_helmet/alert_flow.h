#pragma once
// Accident -> cancel window -> send SMS -> done. Pure logic, no Arduino dependencies.
#include <stdint.h>

enum class FlowState : uint8_t { Idle, CancelWindow, Sending, Done };
enum class FlowEvent : uint8_t { None, SendNow };

class AlertFlow {
 public:
  AlertFlow(uint32_t cancelWindowMs = 10000, uint32_t doneHoldMs = 8000)
      : cancelMs_(cancelWindowMs), doneHoldMs_(doneHoldMs) {}

  FlowState state() const { return state_; }
  bool wasCancelled() const { return cancelled_; }
  bool active() const { return state_ != FlowState::Idle; }

  // An accident was detected. Starts the cancel window. Ignored if a flow is already running.
  bool onAccident(uint32_t nowMs) {
    if (state_ != FlowState::Idle) return false;
    state_ = FlowState::CancelWindow;
    startMs_ = nowMs;
    cancelled_ = false;
    return true;
  }

  // The rider pressed the cancel button. Only works during the cancel window.
  bool onCancelPressed() {
    if (state_ != FlowState::CancelWindow) return false;
    state_ = FlowState::Idle;
    cancelled_ = true;
    return true;
  }

  // The SMS attempt (including waiting for the module) is over.
  void onSendingFinished(uint32_t nowMs) {
    if (state_ != FlowState::Sending) return;
    state_ = FlowState::Done;
    startMs_ = nowMs;
  }

  // Call every loop. Returns SendNow once, when the cancel window has expired.
  FlowEvent update(uint32_t nowMs) {
    if (state_ == FlowState::CancelWindow && (uint32_t)(nowMs - startMs_) >= cancelMs_) {
      state_ = FlowState::Sending;
      startMs_ = nowMs;
      return FlowEvent::SendNow;
    }
    if (state_ == FlowState::Done && (uint32_t)(nowMs - startMs_) >= doneHoldMs_) {
      state_ = FlowState::Idle;
    }
    return FlowEvent::None;
  }

  // Seconds left to cancel (0 outside the window). Useful for serial output.
  uint32_t cancelSecondsLeft(uint32_t nowMs) const {
    if (state_ != FlowState::CancelWindow) return 0;
    uint32_t elapsed = nowMs - startMs_;
    return elapsed >= cancelMs_ ? 0 : (cancelMs_ - elapsed + 999) / 1000;
  }

  // Buzzer pattern: fast beeping while the rider can still cancel, slow beeping while
  // the SMS is being sent and for a short time after, silent otherwise.
  bool buzzerOn(uint32_t nowMs) const {
    switch (state_) {
      case FlowState::CancelWindow: return ((nowMs - startMs_) / 200) % 2 == 0;
      case FlowState::Sending:
      case FlowState::Done:         return ((nowMs - startMs_) / 1000) % 2 == 0;
      default:                      return false;
    }
  }

 private:
  FlowState state_ = FlowState::Idle;
  uint32_t cancelMs_;
  uint32_t doneHoldMs_;
  uint32_t startMs_ = 0;
  bool cancelled_ = false;
};
