#pragma once
// Minimal MPU6050 driver: reads acceleration and returns the total magnitude in g.
// No library needed. Range +-16 g (2048 LSB per g) so a crash does not clip the sensor.
#include <Arduino.h>
#include <Wire.h>
#include <math.h>

class Mpu6050 {
 public:
  explicit Mpu6050(uint8_t address = 0x68) : addr_(address) {}

  // Wakes the sensor and configures it. Returns false if it does not answer or is not an MPU6050 family chip.
  bool begin() {
    uint8_t who = 0;
    if (!readReg(0x75, &who)) return false;                    // WHO_AM_I
    if (who != 0x68 && who != 0x70 && who != 0x72) return false;   // 6050 / 6500 / clones
    if (!writeReg(0x6B, 0x00)) return false;                   // PWR_MGMT_1: wake up
    delay(10);
    if (!writeReg(0x1C, 0x18)) return false;                   // ACCEL_CONFIG: +-16 g
    if (!writeReg(0x1A, 0x03)) return false;                   // CONFIG: low-pass filter ~44 Hz
    return true;
  }

  // Total acceleration magnitude in g (about 1.0 when still). Returns false on any bus error.
  bool readMagnitudeG(float& mag) {
    Wire.beginTransmission(addr_);
    Wire.write(0x3B);                                          // ACCEL_XOUT_H
    if (Wire.endTransmission(false) != 0) return false;
    if (Wire.requestFrom((int)addr_, 6) != 6) return false;
    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();
    const float k = 1.0f / 2048.0f;
    float x = ax * k, y = ay * k, z = az * k;
    mag = sqrtf(x * x + y * y + z * z);
    return true;
  }

 private:
  bool writeReg(uint8_t reg, uint8_t val) {
    Wire.beginTransmission(addr_);
    Wire.write(reg);
    Wire.write(val);
    return Wire.endTransmission() == 0;
  }
  bool readReg(uint8_t reg, uint8_t* val) {
    Wire.beginTransmission(addr_);
    Wire.write(reg);
    if (Wire.endTransmission(false) != 0) return false;
    if (Wire.requestFrom((int)addr_, 1) != 1) return false;
    *val = Wire.read();
    return true;
  }
  uint8_t addr_;
};
