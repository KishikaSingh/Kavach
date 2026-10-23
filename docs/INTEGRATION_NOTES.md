# Kavach System Integration & Notification Architecture Notes

*Engineering reference detailing cross-tier data synchronization, incident confidence scoring, emergency contact dispatching, and failover boundaries.*

---

## Table of Contents

- [Architectural Scope & Integration Topology](#architectural-scope--integration-topology)
- [Emergency Contact Notification Architecture](#emergency-contact-notification-architecture)
- [Incident Confidence Scoring Algorithm](#incident-confidence-scoring-algorithm)
- [Contact Validation & Normalization](#contact-validation--normalization)
- [Idempotent Deduplication & Retry Dynamics](#idempotent-deduplication--retry-dynamics)
- [Gateway Integration Boundaries & Fallbacks](#gateway-integration-boundaries--fallbacks)
- [User Experience & Visual Delivery States](#user-experience--visual-delivery-states)
- [Remaining Integration Dependencies & Calibration](#remaining-integration-dependencies--calibration)

---

## Architectural Scope & Integration Topology

Kavach coordinates three autonomous technical tiers:
1. **Embedded Microcontroller Tier (`firmware/KavachHelmet`):** Bare-metal ESP32 executing kinematic collision sampling and hardware GSM cellular dispatch.
2. **Cloud Tier (`supabase/`):** Supabase PostgreSQL relational engine providing Row Level Security (*RLS*), Realtime WebSocket propagation, and edge functions.
3. **Mobile Client Tier (`frontend/`):** React Native mobile client executing shared reactive hooks, incident confidence scoring, and local failover messaging.

---

## Emergency Contact Notification Architecture

The mobile application implements a dedicated emergency notification module located in `frontend/src/services/emergencyNotificationService.js`. When an accident alert is surfaced from Supabase or simulated in Demo Mode, the service executes a multi-step escalation sequence:

```text
Incident Ingestion -> Confidence Calculation -> Threshold Gate
                                                    |
             +--------------------------------------+--------------------------------------+
             |                                                                             |
      Confidence < Threshold                                                        Confidence >= Threshold
      Suppressed / Logged Internally                                                EMERGENCY DISPATCH
                                                                                    - Resolve Primary Contact
                                                                                    - Validate E.164 Phone
                                                                                    - Claim Idempotency Key
                                                                                    - Build Google Maps Link
                                                                                    - Dispatch via Active Provider
                                                                                    - Update Status in UI Banner
```

---

## Incident Confidence Scoring Algorithm

To eliminate false triggers arising from minor bumps, potholes, or benign helmet handling, incoming alerts are scored against a normalized confidence index (*ranging from 0.00 to 1.00*):

- **Severity Mapping:**
  - `high`: Normalized score of **0.95**.
  - `medium`: Normalized score of **0.75**.
  - `low`: Normalized score of **0.35**.
- **Explicit Scoring:** If the incoming incident payload supplies an explicit numeric `confidence` value, it takes precedence.
- **Configurable Confidence Gate:** Alerts are evaluated against the user-configurable threshold (*default: `0.60`*). Incidents falling below this threshold are logged in diagnostic telemetry but are strictly blocked from notifying emergency contacts.

---

## Contact Validation & Normalization

1. **E.164 Formatting:** Phone numbers are normalized using `normalizePhone` to ensure international dialing compatibility (*e.g., `+919876543210`*). Invalid formats are flagged before saving.
2. **Priority Ordering:** The dispatch algorithm sorts registered contacts, routing the emergency alert to the designated **Primary Contact** first.
3. **Graceful Handling of Empty Contacts:** If no emergency contacts have been registered, the service marks the incident status as `no_contacts` and prompts the rider to configure their safety network.

---

## Idempotent Deduplication & Retry Dynamics

- **Incident Tracking:** Every incident is tracked by a stable compound identifier (`alertId`).
- **Idempotency Guard:** Completed dispatches are logged to in-memory state and persistent device storage (`@kavach:emergency_dispatches`). Repeated triggers for the same incident are automatically suppressed.
- **Manual Retry Flow:** If network loss causes a dispatch to fail, the incident banner in `AlertDetailsScreen` displays an explicit **Retry Dispatch** action without corrupting application state.

---

## Gateway Integration Boundaries & Fallbacks

Emergency dispatch adapts dynamically to the active operational environment:

1. **Demo Mode:** Dispatches are logged as `demo_sent` without making external network calls.
2. **Configured Live Mode:** If `EXPO_PUBLIC_EMERGENCY_SMS_GATEWAY_URL` is configured in the root `.env`, dispatches execute via HTTP POST webhooks with optional API key headers.
3. **Unconfigured Live Mode:** If no gateway is configured, the system marks the incident as `unconfigured` (*never falsely asserting delivery*) and generates a pre-formatted native SMS draft link (`sms:+91...?body=...`) allowing the rider or bystander to send the alert via the phone's native dialer.

---

## User Experience & Visual Delivery States

The `AlertDetailsScreen` displays an interactive `EmergencyDispatchBanner` reflecting live delivery status:

- `sending`: Dispatch in transit.
- `sent`: Gateway confirmed delivery.
- `demo_sent`: Simulation confirmed without external network calls.
- `unconfigured`: No external gateway provisioned; manual SMS fallback active.
- `failed`: Network or provider error; retry available.
- `no_contacts`: No emergency contacts registered; prompt to configure.

---

## Remaining Integration Dependencies & Calibration

- **Deceleration Calibration:** The default impact threshold (`3.0 G`) in `firmware/KavachHelmet/` requires physical validation on a drop-test rig prior to on-road trials.
- **Cellular Carrier Validation:** The SIM800L / SIM900A series requires 2G GSM cellular service. Ensure local carriers support 2G signaling in the operational deployment zone.
- **Hardware Power Isolation:** Always power the cellular modem from an independent high-current rail capable of 2.0 A burst loads.
