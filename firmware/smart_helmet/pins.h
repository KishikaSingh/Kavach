#pragma once
// Pin map for a standard 30/38-pin ESP32 DevKit. Change here if you wire differently.
//
//  MPU6050 (I2C)   SDA -> GPIO21   SCL -> GPIO22   VCC -> 3V3   GND -> GND
//  GPS (NEO-6M)    GPS TX -> GPIO16 (ESP32 RX2)   GPS RX -> GPIO17 (ESP32 TX2)   VCC 3V3/5V per module
//  SIM800L         SIM TXD -> GPIO26 (ESP32 RX1)  SIM RXD -> GPIO27 (ESP32 TX1)
//                  VCC -> 3.7-4.2 V supply that can give 2 A peaks (NOT the ESP32 3V3 pin), GND shared
//  Buzzer          active buzzer + -> GPIO25 (through a transistor if it draws > 20 mA), - -> GND
//  Cancel button   one side -> GPIO33, other side -> GND (uses the internal pull-up)

#define PIN_I2C_SDA        21
#define PIN_I2C_SCL        22

#define PIN_GPS_RX         16   // ESP32 receives from GPS TX
#define PIN_GPS_TX         17
#define GPS_BAUD           9600

#define PIN_SIM_RX         26   // ESP32 receives from SIM800L TXD
#define PIN_SIM_TX         27
#define SIM_BAUD           9600

#define PIN_BUZZER         25
#define PIN_CANCEL_BUTTON  33
#define PIN_STATUS_LED      2   // on-board LED
