# Kavach Accident SMS & Emergency Dispatch Setup Manual

*Comprehensive guide to configuring, calibrating, and operating dual-channel emergency messaging within the Kavach Smart Helmet ecosystem.*

---

## Table of Contents

- [Architectural Scope & Dual-Channel Model](#architectural-scope--dual-channel-model)
- [Channel 1: Autonomous Hardware GSM Dispatch](#channel-1-autonomous-hardware-gsm-dispatch)
- [Channel 2: Client & Cloud Gateway Dispatch](#channel-2-client--cloud-gateway-dispatch)
- [Fallback Strategy: Native Handset SMS Intent](#fallback-strategy-native-handset-sms-intent)
- [Message Template & Geolocation Payload](#message-template--geolocation-payload)
- [Gateway Configuration & Environment Mapping](#gateway-configuration--environment-mapping)
- [Testing & End-to-End Validation](#testing--end-to-end-validation)

---

## Architectural Scope & Dual-Channel Model

Kavach employs an asymmetric **dual-channel messaging topology** to maximize transmission survivability during high-severity vehicular trauma:

```text
+-------------------------------------------------------------------------------+
|                       VEHICULAR IMPACT TRAUMA DETECTED                        |
+-------------------------------------------------------------------------------+
          |                                                   |
   [Out-of-Band Channel 1]                             [IP Telemetry Channel 2]
   Autonomous Hardware GSM                             Supabase Realtime Stream
          |                                                   |
          v                                                   v
+-----------------------------+                     +---------------------------+
| SIM800L / SIM900A MODEM     |                     | KAVACH MOBILE APP         |
| Direct GSM Cellular Network |                     |                           |
| - Zero phone dependency     |                     | - Confidence evaluation   |
| - Zero internet dependency  |                     | - HTTP SMS Gateway Hook   |
| - Sends to fixed recipient  |                     | - Native SMS Fallback     |
+-----------------------------+                     +---------------------------+
          |                                                   |
          v                                                   v
+-----------------------------+                     +---------------------------+
| PRIMARY EMERGENCY RECIPIENT |                     | ALL REGISTERED CONTACTS   |
+-----------------------------+                     +---------------------------+
```

---

## Channel 1: Autonomous Hardware GSM Dispatch

### Operating Characteristics
- **Independence:** Operates directly on the embedded ESP32 microcontroller without requiring smartphone tethering, Bluetooth pairing, or mobile internet availability.
- **Protocol:** Standard 3GPP AT command sequences (`AT+CMGS`) transmitted over hardware UART serial pins (GPIO 26 RX, GPIO 27 TX).
- **Target Recipient:** Configured in `firmware/KavachHelmet/config.h` as `SMS_RECIPIENT_E164`.

### Hardware Configuration Checklist
1. Ensure an active nano-SIM card is inserted with international SMS messaging quota enabled.
2. Confirm the modem power rail provides a dedicated 3.7 V to 4.2 V supply capable of sustaining 2.0 A peak surges.
3. Verify modem network registration output returns `+CREG: 0,1` (*Home Network*) or `+CREG: 0,5` (*Roaming*).

---

## Channel 2: Client & Cloud Gateway Dispatch

### Operating Characteristics
- **Selective Escalation:** Incidents surfaced over Supabase Realtime are filtered by the incident confidence scoring engine (*default threshold: `0.60`*).
- **Contact Priority:** Resolves all registered emergency contacts from Supabase `emergency_contacts`, prioritizing designated primary contacts.
- **Webhook Integration:** Dispatches formatted emergency payloads over HTTPS to an external SMS gateway or communication webhook (*e.g., Twilio, AWS SNS, or custom HTTP relay*).

---

## Fallback Strategy: Native Handset SMS Intent

If no external SMS gateway is configured in production live mode:

1. The incident banner reports delivery status as `unconfigured`.
2. The user interface exposes a **Send SMS Manually** action button.
3. Tapping the action activates the mobile operating system's native SMS intent (`sms:+919876543210?body=...`), pre-populating the emergency text, recipient, and Google Maps location URL directly into the rider's native messaging application.

---

## Message Template & Geolocation Payload

Emergency messages conform to standard concise emergency formats:

### Format with Valid Satellite Fix
```text
EMERGENCY ALERT: Kavach Smart Helmet detected a severe impact for rider [Rider Name] at [Detection Time].
Location: https://www.google.com/maps?q=12.9716,77.5946
Device: HELMET_001
Please verify safety immediately.
```

### Format with Degraded / Unavailable Satellite Fix
```text
EMERGENCY ALERT: Kavach Smart Helmet detected a severe impact for rider [Rider Name] at [Detection Time].
Location: GPS fix unavailable (satellite searching)
Device: HELMET_001
Please verify safety immediately.
```

---

## Gateway Configuration & Environment Mapping

Configure external gateway endpoints in the centralized repository root `.env` file:

```properties
# Primary external HTTP SMS dispatch gateway
EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL=https://api.sms-provider.com/v1/dispatch

# Optional authorization API key or Bearer token
EXPO_PUBLIC_EMERGENCY_SMS_API_KEY=your-secure-gateway-token
```

*Note: Bundlers, migration scripts, and test harnesses automatically resolve `.env` from the repository root.*

---

## Testing & End-to-End Validation

1. **In-App Demo Simulation:** Run with `EXPO_PUBLIC_DATA_SOURCE=demo`. Trigger an accident alert; observe the delivery banner display `demo_sent`.
2. **Unconfigured Gateway Verification:** Run in live mode without gateway variables. Trigger an alert; observe the status display `unconfigured` and confirm the native SMS intent button functions correctly.
3. **Automated Verification:** Execute `npm test -- emergency` to validate phone normalization, duplicate suppression, and gateway error recovery.
