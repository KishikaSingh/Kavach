#include "test_framework.h"
#include "../sim800.h"
#include <string>
#include <deque>

// A fake serial port: tests push "modem output" with feed() and inspect what the driver wrote.
struct FakeStream : ByteStream {
  std::deque<char> rx;
  std::string tx;
  int available() override { return (int)rx.size(); }
  int read() override { if (rx.empty()) return -1; char c = rx.front(); rx.pop_front(); return (unsigned char)c; }
  void write(const char* t) override { tx += t; }
  void writeByte(uint8_t b) override { tx += (char)b; }
  void feed(const std::string& s) { for (char c : s) rx.push_back(c); }
};

static const char* CDS(int mr, int st) {
  static char buf[160];
  snprintf(buf, sizeof(buf), "\r\n+CDS: 6,%d,\"+911\",145,\"26/10/11,17:22:00+22\",\"26/10/11,17:22:05+22\",%d\r\n", mr, st);
  return buf;
}

struct Rig {
  FakeStream port;
  Sim800 modem;
  uint32_t now = 1000;
  Rig() : modem(port) {}
  void run(uint32_t ms) { for (uint32_t t = 0; t < ms; t += 10) { now += 10; modem.poll(now); } }
  // answer every init command with OK until the modem is ready
  void bringUp() {
    modem.begin(now);
    for (int i = 0; i < 6; i++) {
      run(20);
      if (i == 5) port.feed("\r\n+CREG: 0,1\r\n\r\nOK\r\n"); else port.feed("\r\nOK\r\n");
      run(20);
    }
  }
  // drive one SMS through prompt + accepted
  int sendAccepted(const char* number, int mr) {
    int t = modem.sendSms(number, "Help me", now);
    port.feed("\r\n> "); run(20);
    char buf[40]; snprintf(buf, sizeof(buf), "\r\n+CMGS: %d\r\n\r\nOK\r\n", mr);
    port.feed(buf); run(20);
    return t;
  }
};

static bool contains(const std::string& hay, const char* needle) { return hay.find(needle) != std::string::npos; }

static void test_init_sequence_and_registration() {
  Rig r;
  r.bringUp();
  CHECK(r.modem.ready());
  CHECK(r.modem.registered());
  size_t a = r.port.tx.find("AT\r"), b = r.port.tx.find("ATE0\r"), c = r.port.tx.find("AT+CMGF=1\r");
  size_t d = r.port.tx.find("AT+CNMI=2,1,0,1,0\r"), e = r.port.tx.find("AT+CSMP=49,167,0,0\r");
  CHECK(a < b && b < c && c < d && d < e);   // order, and delivery reports requested
}

static void test_init_retries_then_gives_up_then_retries_later() {
  Rig r;
  r.modem.begin(r.now);
  r.run(5 * 2100);                           // 5 tries of 2 s with no answer
  CHECK(!r.modem.ready());
  size_t count = 0, pos = 0;
  while ((pos = r.port.tx.find("AT\r", pos)) != std::string::npos) { count++; pos += 3; }
  CHECK(count == 5);
  r.port.tx.clear();
  r.run(31000);                              // retry after 30 s
  CHECK(contains(r.port.tx, "AT\r"));
  r.port.feed("\r\nOK\r\n");                 // the modem finally wakes up
  r.run(100);
  CHECK(contains(r.port.tx, "ATE0\r"));
}

static void test_registration_states_and_unsolicited() {
  Rig r;
  r.bringUp();
  r.port.feed("\r\n+CREG: 0,2\r\n");  r.run(20); CHECK(!r.modem.registered());  // searching
  r.port.feed("\r\n+CREG: 0,5\r\n");  r.run(20); CHECK(r.modem.registered());   // roaming
  r.port.feed("\r\n+CREG: 0\r\n");    r.run(20); CHECK(!r.modem.registered());  // unsolicited, not registered
  r.port.feed("\r\n+CREG: 1\r\n");    r.run(20); CHECK(r.modem.registered());   // unsolicited, registered
}

static void test_periodic_registration_poll_and_reinit_when_modem_dies() {
  Rig r;
  r.bringUp();
  r.port.tx.clear();
  r.run(16000);
  CHECK(contains(r.port.tx, "AT+CREG?\r"));
  r.port.feed("\r\n+CREG: 0,1\r\n\r\nOK\r\n"); r.run(50);
  CHECK(r.modem.ready());
  r.run(15000 * 3 + 3 * 2100 + 500);       // modem goes silent: three unanswered queries
  CHECK(!r.modem.ready());                 // re-init started, modem not ready
}

static void test_sms_delivered_path() {
  Rig r;
  r.bringUp();
  r.port.tx.clear();
  int t = r.modem.sendSms("+919999900001", "Help me", r.now);
  CHECK(t >= 0);
  CHECK(contains(r.port.tx, "AT+CMGS=\"+919999900001\"\r"));
  CHECK(r.modem.sendState(t) == SendState::WaitPrompt);
  CHECK(r.modem.sendSms("+919999900002", "second", r.now) == -1);   // modem busy sending
  r.port.feed("\r\n> "); r.run(20);
  CHECK(contains(r.port.tx, "Help me"));
  CHECK(r.port.tx.back() == 0x1A);                                   // Ctrl+Z sent
  CHECK(r.modem.sendState(t) == SendState::WaitResult);
  r.port.feed("\r\n+CMGS: 17\r\n\r\nOK\r\n"); r.run(20);
  CHECK(r.modem.accepted(t));                                        // accepted by the network...
  CHECK(r.modem.delivery(t) == DeliveryState::Waiting);              // ...but NOT yet delivered
  CHECK(r.modem.sendFinished(t) && !r.modem.ticketFinal(t));
  CHECK(r.modem.messageRef(t) == 17);
  r.port.feed(CDS(17, 0)); r.run(20);
  CHECK(r.modem.delivery(t) == DeliveryState::Delivered);
  CHECK(r.modem.ticketFinal(t));
  r.modem.release(t);
  CHECK(r.modem.sendState(t) == SendState::Idle);
}

static void test_two_recipients_do_not_wait_for_each_others_delivery_report() {
  Rig r;
  r.bringUp();
  int a = r.sendAccepted("+919999900001", 7);
  CHECK(r.modem.delivery(a) == DeliveryState::Waiting);
  int b = r.sendAccepted("+919999900002", 8);      // sent right away, report for A still pending
  CHECK(b >= 0 && b != a);
  CHECK(r.modem.delivery(b) == DeliveryState::Waiting);
  r.port.feed(CDS(8, 0)); r.run(20);               // B's report arrives first
  CHECK(r.modem.delivery(b) == DeliveryState::Delivered);
  CHECK(r.modem.delivery(a) == DeliveryState::Waiting);
  r.port.feed(CDS(7, 70)); r.run(20);              // A permanently failed
  CHECK(r.modem.delivery(a) == DeliveryState::Failed);
  CHECK(r.modem.accepted(a));                      // it did reach the network
}

static void test_sms_modem_error() {
  Rig r;
  r.bringUp();
  int t = r.modem.sendSms("+919999900001", "x", r.now);
  r.port.feed("\r\n+CMS ERROR: 500\r\n"); r.run(20);
  CHECK(r.modem.sendState(t) == SendState::Failed);
  CHECK(!r.modem.accepted(t) && r.modem.ticketFinal(t));
  CHECK(!r.modem.sendingNow());

  Rig r2;
  r2.bringUp();
  int t2 = r2.modem.sendSms("+919999900001", "x", r2.now);
  r2.port.feed("\r\n> "); r2.run(20);
  r2.port.feed("\r\nERROR\r\n"); r2.run(20);
  CHECK(r2.modem.sendState(t2) == SendState::Failed);
  // the modem is free again: a retry can start
  CHECK(r2.modem.sendSms("+919999900001", "x", r2.now) >= 0);
}

static void test_sms_timeouts() {
  Rig p;                                   // no prompt
  p.bringUp();
  int tp = p.modem.sendSms("+919999900001", "x", p.now);
  p.run(10500);
  CHECK(p.modem.sendState(tp) == SendState::Failed);
  CHECK(p.port.tx.back() == 0x1B);         // ESC cancels the half-started message

  Rig q;                                   // text sent but modem never answers: outcome unknown
  q.bringUp();
  int tq = q.modem.sendSms("+919999900001", "x", q.now);
  q.port.feed("\r\n> "); q.run(20);
  q.run(61000);
  CHECK(q.modem.sendState(tq) == SendState::NoResponse);
  CHECK(q.modem.ticketFinal(tq));

  Rig d;                                   // accepted but no delivery report: unknown, still accepted
  d.bringUp();
  int td = d.sendAccepted("+919999900001", 3);
  d.run(121000);
  CHECK(d.modem.delivery(td) == DeliveryState::Unknown);
  CHECK(d.modem.accepted(td));
}

static void test_delivery_report_matching() {
  Rig r;
  r.bringUp();
  int t = r.sendAccepted("+919999900001", 21);
  r.port.feed(CDS(99, 0)); r.run(20);                      // report for a different message: ignored
  CHECK(r.modem.delivery(t) == DeliveryState::Waiting);
  r.port.feed(CDS(21, 48)); r.run(20);                     // temporary condition: keep waiting
  CHECK(r.modem.delivery(t) == DeliveryState::Waiting);
  r.port.feed(CDS(21, 0)); r.run(20);
  CHECK(r.modem.delivery(t) == DeliveryState::Delivered);
  r.port.feed(CDS(21, 70)); r.run(20);                     // a late duplicate does not change a final result
  CHECK(r.modem.delivery(t) == DeliveryState::Delivered);
}

static void test_cannot_send_before_ready_and_ticket_limit() {
  Rig r;
  CHECK(r.modem.sendSms("+919999900001", "x", r.now) == -1);
  r.modem.begin(r.now);
  CHECK(r.modem.sendSms("+919999900001", "x", r.now) == -1);   // still initialising

  Rig q;
  q.bringUp();
  int ids[4];
  for (int i = 0; i < 4; i++) ids[i] = q.sendAccepted("+919999900001", i + 1);
  CHECK(q.modem.sendSms("+919999900001", "x", q.now) == -1);   // all tickets in use
  q.modem.release(ids[0]);
  CHECK(q.modem.sendSms("+919999900001", "x", q.now) >= 0);
}

int main() {
  RUN(test_init_sequence_and_registration);
  RUN(test_init_retries_then_gives_up_then_retries_later);
  RUN(test_registration_states_and_unsolicited);
  RUN(test_periodic_registration_poll_and_reinit_when_modem_dies);
  RUN(test_sms_delivered_path);
  RUN(test_two_recipients_do_not_wait_for_each_others_delivery_report);
  RUN(test_sms_modem_error);
  RUN(test_sms_timeouts);
  RUN(test_delivery_report_matching);
  RUN(test_cannot_send_before_ready_and_ticket_limit);
  TEST_MAIN_END();
}
