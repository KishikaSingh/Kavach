#pragma once
// Connects the hardware serial ports to the ByteStream interface used by the SIM800L driver.
#include <Arduino.h>
#include "byte_stream.h"

class HardwareSerialStream : public ByteStream {
 public:
  explicit HardwareSerialStream(HardwareSerial& port) : port_(port) {}
  int available() override { return port_.available(); }
  int read() override { return port_.read(); }
  void write(const char* text) override { port_.print(text); }
  void writeByte(uint8_t b) override { port_.write(b); }

 private:
  HardwareSerial& port_;
};
