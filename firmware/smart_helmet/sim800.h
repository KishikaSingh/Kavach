#pragma once
// Non-blocking SIM800L driver for emergency SMS, with REAL delivery evidence.
//
// Each SMS gets a "ticket". Sending happens one message at a time (the modem has one AT
// interface), but delivery reports are tracked per ticket, so a second recipient is never
// delayed by waiting for the first one's delivery report.
//
// What "delivered" means here: the modem is asked for an SMS status report (AT+CSMP/AT+CNMI).
// A ticket counts as delivered only when a +CDS report for that message says status 0.
// "+CMGS: <n>" + OK only means the network accepted the message (SendState::Accepted),
// which is not the same as the phone having received it.
//
// Pure logic over ByteStream: no Arduino dependencies, tested on a PC with a fake modem.
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "byte_stream.h"

enum class SendState : uint8_t {
  Idle,        // unused ticket
  WaitPrompt,  // sent AT+CMGS, waiting for the '>' prompt
  WaitResult,  // sent the text, waiting for +CMGS / OK / ERROR
  Accepted,    // the network accepted the message (+CMGS + OK)
  Failed,      // the modem reported an error or never showed the prompt
  NoResponse   // text sent but the modem never answered: the outcome is unknown
};

enum class DeliveryState : uint8_t {
  None,       // not accepted (yet)
  Waiting,    // accepted, waiting for the delivery report
  Delivered,  // report: delivered (status 0)
  Failed,     // report: permanent failure (status 64 or higher)
  Unknown     // no usable report arrived in time
};

struct Sim800Timing {
  uint32_t cmdTimeoutMs = 2000;
  uint32_t promptTimeoutMs = 10000;
  uint32_t resultTimeoutMs = 60000;
  uint32_t deliveryTimeoutMs = 120000;
  uint32_t initRetryMs = 30000;
  uint32_t cregEveryMs = 15000;
};

class Sim800 {
 public:
  static constexpr int kMaxTickets = 4;

  explicit Sim800(ByteStream& s, const Sim800Timing& t = Sim800Timing()) : s_(s), t_(t) {}

  // Start the init sequence (call once in setup).
  void begin(uint32_t now) {
    ready_ = false;
    registered_ = false;
    initStep_ = 0;
    initTries_ = 0;
    mode_ = Mode::Init;
    startCommand(initCmd(0), now, t_.cmdTimeoutMs);
  }

  // Call often (every loop).
  void poll(uint32_t now) {
    readSerial(now);

    // Timeouts of the message being sent right now.
    if (cur_ >= 0) {
      Ticket& k = tk_[cur_];
      if (k.send == SendState::WaitPrompt && (uint32_t)(now - k.sendStart) >= t_.promptTimeoutMs) {
        s_.writeByte(0x1B);  // ESC: cancel the half-started message
        k.send = SendState::Failed;
        cur_ = -1;
      } else if (k.send == SendState::WaitResult && (uint32_t)(now - k.sendStart) >= t_.resultTimeoutMs) {
        k.send = SendState::NoResponse;
        cur_ = -1;
      }
    }
    // Delivery report timeouts of messages already accepted.
    for (int i = 0; i < kMaxTickets; i++) {
      Ticket& k = tk_[i];
      if (k.used && k.send == SendState::Accepted && k.delivery == DeliveryState::Waiting &&
          (uint32_t)(now - k.acceptedAt) >= t_.deliveryTimeoutMs) {
        k.delivery = DeliveryState::Unknown;
      }
    }
    if (cur_ >= 0) return;  // the modem is busy sending: no housekeeping

    if (mode_ == Mode::Init || mode_ == Mode::Query) {
      if (cmdResult_ != CmdResult::None) {
        CmdResult r = cmdResult_;
        cmdResult_ = CmdResult::None;
        cmdPending_ = false;
        onCommandDone(r, now);
      } else if (cmdPending_ && (uint32_t)(now - cmdStart_) >= cmdTimeout_) {
        cmdPending_ = false;
        onCommandDone(CmdResult::Timeout, now);
      }
    } else if (mode_ == Mode::InitFailed) {
      if ((uint32_t)(now - initFailedAt_) >= t_.initRetryMs) begin(now);
    } else if (mode_ == Mode::Idle) {
      if ((uint32_t)(now - lastCreg_) >= t_.cregEveryMs) {
        mode_ = Mode::Query;
        lastCreg_ = now;
        startCommand("AT+CREG?", now, t_.cmdTimeoutMs);
      }
    }
  }

  bool ready() const { return ready_; }            // modem answered the init sequence
  bool registered() const { return registered_; }  // registered on the GSM network
  bool sendingNow() const { return cur_ >= 0; }

  // Start sending one SMS. Returns a ticket number, or -1 if the modem is not ready, is busy
  // sending another message, or all tickets are in use (release finished ones).
  int sendSms(const char* number, const char* text, uint32_t now) {
    if (!ready_ || cur_ >= 0 || mode_ != Mode::Idle) return -1;
    int idx = -1;
    for (int i = 0; i < kMaxTickets; i++) if (!tk_[i].used) { idx = i; break; }
    if (idx < 0) return -1;
    tk_[idx] = Ticket();
    tk_[idx].used = true;
    tk_[idx].send = SendState::WaitPrompt;
    tk_[idx].sendStart = now;
    snprintf(body_, sizeof(body_), "%s", text);
    cur_ = idx;
    s_.write("AT+CMGS=\"");
    s_.write(number);
    s_.write("\"\r");
    return idx;
  }

  SendState sendState(int t) const { return valid(t) ? tk_[t].send : SendState::Idle; }
  DeliveryState delivery(int t) const { return valid(t) ? tk_[t].delivery : DeliveryState::None; }
  bool accepted(int t) const { return valid(t) && tk_[t].send == SendState::Accepted; }
  int messageRef(int t) const { return valid(t) && tk_[t].hasMr ? tk_[t].mr : -1; }
  // The sending phase is over (accepted, failed or no answer). Delivery may still be pending.
  bool sendFinished(int t) const {
    SendState s = sendState(t);
    return s == SendState::Accepted || s == SendState::Failed || s == SendState::NoResponse;
  }
  // Nothing more will change for this ticket.
  bool ticketFinal(int t) const {
    SendState s = sendState(t);
    if (s == SendState::Failed || s == SendState::NoResponse) return true;
    return s == SendState::Accepted && tk_[t].delivery != DeliveryState::Waiting;
  }
  void release(int t) { if (valid(t) && t != cur_) tk_[t] = Ticket(); }

 private:
  struct Ticket {
    bool used = false;
    SendState send = SendState::Idle;
    DeliveryState delivery = DeliveryState::None;
    int mr = -1;
    bool hasMr = false;
    uint32_t sendStart = 0;
    uint32_t acceptedAt = 0;
  };
  enum class Mode : uint8_t { Init, InitFailed, Idle, Query };
  enum class CmdResult : uint8_t { None, Ok, Error, Timeout };

  static constexpr int kInitCount = 6;
  static const char* initCmd(int i) {
    static const char* const cmds[kInitCount] = {
      "AT",                    // wake up / autobaud
      "ATE0",                  // no echo
      "AT+CMGF=1",             // SMS text mode
      "AT+CNMI=2,1,0,1,0",     // route SMS status reports (+CDS) to the serial port
      "AT+CSMP=49,167,0,0",    // ask the network for a delivery report for every SMS we send
      "AT+CREG?"               // network registration status
    };
    return cmds[i];
  }

  bool valid(int t) const { return t >= 0 && t < kMaxTickets && tk_[t].used; }

  void startCommand(const char* cmd, uint32_t now, uint32_t timeout) {
    cmdResult_ = CmdResult::None;
    cmdPending_ = true;
    cmdStart_ = now;
    cmdTimeout_ = timeout;
    s_.write(cmd);
    s_.write("\r");
  }

  void onCommandDone(CmdResult r, uint32_t now) {
    if (mode_ == Mode::Query) {
      if (r == CmdResult::Ok) {
        missedQueries_ = 0;
      } else if (++missedQueries_ >= 3) {
        begin(now);   // the modem stopped answering: run the init sequence again
        return;
      }
      mode_ = Mode::Idle;
      return;
    }
    if (r == CmdResult::Ok) {
      initTries_ = 0;
      if (++initStep_ >= kInitCount) {
        ready_ = true;
        mode_ = Mode::Idle;
        lastCreg_ = now;
        missedQueries_ = 0;
        return;
      }
      startCommand(initCmd(initStep_), now, t_.cmdTimeoutMs);
      return;
    }
    if (++initTries_ >= 5) {   // the modem may still be booting: retry a few times
      ready_ = false;
      mode_ = Mode::InitFailed;
      initFailedAt_ = now;
      return;
    }
    startCommand(initCmd(initStep_), now, t_.cmdTimeoutMs);
  }

  void readSerial(uint32_t now) {
    while (s_.available() > 0) {
      int c = s_.read();
      if (c < 0) break;
      if (c == '\r') continue;
      if (c == '\n') {
        if (lineLen_ > 0) {
          line_[lineLen_] = 0;
          handleLine(line_, now);
          lineLen_ = 0;
        }
        continue;
      }
      if (lineLen_ < sizeof(line_) - 1) line_[lineLen_++] = (char)c;
      // The '>' prompt has no line ending.
      if (c == '>' && cur_ >= 0 && tk_[cur_].send == SendState::WaitPrompt) {
        lineLen_ = 0;
        s_.write(body_);
        s_.writeByte(0x1A);  // Ctrl+Z ends the message
        tk_[cur_].send = SendState::WaitResult;
        tk_[cur_].sendStart = now;
      }
    }
  }

  static bool startsWith(const char* s, const char* p) { return strncmp(s, p, strlen(p)) == 0; }

  // Split "a,b,"c,d",e" into fields, respecting quotes. Returns the number of fields.
  static int splitFields(const char* s, char out[][40], int maxFields) {
    int n = 0, len = 0;
    bool inQuote = false;
    out[0][0] = 0;
    for (; *s; ++s) {
      if (*s == '"') { inQuote = !inQuote; continue; }
      if (*s == ',' && !inQuote) {
        out[n][len] = 0;
        if (++n >= maxFields) return n;
        len = 0;
        out[n][0] = 0;
        continue;
      }
      if (len < 39 && !(len == 0 && *s == ' ')) out[n][len++] = *s;
    }
    out[n][len] = 0;
    return n + 1;
  }

  void handleLine(const char* l, uint32_t now) {
    if (strcmp(l, "OK") == 0) {
      cmdResult_ = CmdResult::Ok;
      if (cur_ >= 0 && tk_[cur_].send == SendState::WaitResult) {
        Ticket& k = tk_[cur_];
        k.send = SendState::Accepted;
        k.acceptedAt = now;
        // Without a message reference we cannot match a delivery report to this message.
        k.delivery = k.hasMr ? DeliveryState::Waiting : DeliveryState::Unknown;
        cur_ = -1;
      }
    } else if (strcmp(l, "ERROR") == 0 || startsWith(l, "+CME ERROR") || startsWith(l, "+CMS ERROR")) {
      cmdResult_ = CmdResult::Error;
      if (cur_ >= 0 && (tk_[cur_].send == SendState::WaitResult || tk_[cur_].send == SendState::WaitPrompt)) {
        tk_[cur_].send = SendState::Failed;
        cur_ = -1;
      }
    } else if (startsWith(l, "+CREG:")) {
      char f[4][40];
      int n = splitFields(l + 6, f, 4);
      int stat = (n >= 2) ? atoi(f[1]) : atoi(f[0]);   // reply: <n>,<stat>  unsolicited: <stat>
      registered_ = (stat == 1 || stat == 5);
    } else if (startsWith(l, "+CMGS:")) {
      if (cur_ >= 0) { tk_[cur_].mr = atoi(l + 6); tk_[cur_].hasMr = true; }
    } else if (startsWith(l, "+CDS:")) {
      // Text-mode status report: +CDS: <fo>,<mr>,<ra>,<tora>,<scts>,<dt>,<st>
      char f[8][40];
      int n = splitFields(l + 5, f, 8);
      if (n < 7) return;
      int mr = atoi(f[1]), st = atoi(f[6]);
      for (int i = 0; i < kMaxTickets; i++) {
        Ticket& k = tk_[i];
        if (k.used && k.send == SendState::Accepted && k.delivery == DeliveryState::Waiting && k.hasMr && k.mr == mr) {
          if (st == 0) k.delivery = DeliveryState::Delivered;
          else if (st >= 64) k.delivery = DeliveryState::Failed;   // permanent failure
          // 1..63: still trying or unconfirmed: keep waiting until the timeout
        }
      }
    }
  }

  ByteStream& s_;
  Sim800Timing t_;
  Mode mode_ = Mode::InitFailed;
  bool ready_ = false;
  bool registered_ = false;

  int initStep_ = 0;
  int initTries_ = 0;
  uint32_t initFailedAt_ = 0;
  uint32_t lastCreg_ = 0;
  int missedQueries_ = 0;

  bool cmdPending_ = false;
  CmdResult cmdResult_ = CmdResult::None;
  uint32_t cmdStart_ = 0;
  uint32_t cmdTimeout_ = 0;

  Ticket tk_[kMaxTickets];
  int cur_ = -1;            // ticket currently being sent, or -1
  char body_[200] = {0};

  char line_[128];
  size_t lineLen_ = 0;
};
