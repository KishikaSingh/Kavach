-- ==============================================================================
-- Kavach Smart Helmet: Supabase Seed Data
-- Seed file: supabase/seed.sql
-- Description: Seeds demo device HELMET_001, initial telemetry, historical GPS,
--              and sample alert for development and demonstration.
-- ==============================================================================

-- 1. Insert Demo Helmet (unassigned owner for initial demo access)
INSERT INTO public.helmets (id, name, serial_number, hardware_version, created_at, updated_at)
VALUES (
    'HELMET_001',
    'Kavach Smart Helmet Demo',
    'KVH-ESP32-DEMO-001',
    'v1.0-esp32',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hardware_version = EXCLUDED.hardware_version,
    updated_at = timezone('utc'::text, now());

-- 2. Insert Historical & Current Helmet Telemetry
INSERT INTO public.helmet_telemetry (helmet_id, battery_percentage, helmet_status, accident_status, sensor_status, gsm_status, recorded_at)
VALUES
    ('HELMET_001', 90, 'connected', 'normal', 'ok', 'connected', timezone('utc'::text, now() - INTERVAL '30 minutes')),
    ('HELMET_001', 88, 'connected', 'normal', 'ok', 'connected', timezone('utc'::text, now() - INTERVAL '15 minutes')),
    ('HELMET_001', 85, 'connected', 'normal', 'ok', 'connected', timezone('utc'::text, now()));

-- 3. Insert Historical & Current Helmet Locations (GPS Track)
INSERT INTO public.helmet_locations (helmet_id, latitude, longitude, gps_valid, speed, recorded_at)
VALUES
    ('HELMET_001', 12.9705, 77.5930, true, 24.5, timezone('utc'::text, now() - INTERVAL '30 minutes')),
    ('HELMET_001', 12.9710, 77.5938, true, 28.2, timezone('utc'::text, now() - INTERVAL '15 minutes')),
    ('HELMET_001', 12.9716, 77.5946, true, 0.0, timezone('utc'::text, now()));

-- 4. Insert Sample Historical Accident Alert (Resolved)
INSERT INTO public.accident_alerts (id, helmet_id, timestamp, severity, latitude, longitude, gps_valid, status, sms_status, resolved_at)
VALUES (
    'ALERT_SAMPLE_001',
    'HELMET_001',
    timezone('utc'::text, now() - INTERVAL '2 hours'),
    'medium',
    12.9710,
    77.5938,
    true,
    'resolved',
    'simulated',
    timezone('utc'::text, now() - INTERVAL '1 hour 45 minutes')
) ON CONFLICT (id) DO NOTHING;

-- 5. Insert Sample SMS Delivery Log for Audit Trail
INSERT INTO public.sms_delivery_logs (alert_id, recipient_phone, status, provider, message_body, dispatched_at)
VALUES (
    'ALERT_SAMPLE_001',
    '+919876543210',
    'simulated',
    'simulation',
    'EMERGENCY: Kavach Rider detected a fall at 12.97100, 77.59380. Check Kavach app.',
    timezone('utc'::text, now() - INTERVAL '2 hours')
);
