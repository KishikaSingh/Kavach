#pragma once
// Minimal serial-port interface so the SIM800L driver can be tested on a PC with a fake modem.
// On the ESP32 it is implemented by HardwareSerialStream in arduino_adapters.h.
#include <stdint.h>

class ByteStream {
 public:
  virtual ~ByteStream() {}
  virtual int available() = 0;            // number of bytes waiting
  virtual int read() = 0;                 // next byte, or -1
  virtual void write(const char* text) = 0;
  virtual void writeByte(uint8_t b) = 0;
};
