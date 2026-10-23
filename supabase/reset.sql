-- ==============================================================================
-- Kavach Smart Helmet: Reset Demo Data Script
-- Script: supabase/reset.sql
-- Description: Safely clears test telemetry, alerts, and SMS logs while preserving
--              the demo helmet structure, and re-seeds baseline demo readings.
-- ==============================================================================

-- 1. Clean transient records for demo helmet
DELETE FROM public.sms_delivery_logs WHERE alert_id LIKE 'ALERT_%' OR alert_id LIKE 'DEMO_%';
DELETE FROM public.accident_alerts WHERE helmet_id = 'HELMET_001';
DELETE FROM public.helmet_telemetry WHERE helmet_id = 'HELMET_001';
DELETE FROM public.helmet_locations WHERE helmet_id = 'HELMET_001';

-- 2. Insert fresh baseline telemetry (Connected, 85%, Normal, Bangalore location)
INSERT INTO public.helmet_telemetry (helmet_id, battery_percentage, helmet_status, accident_status, sensor_status, gsm_status, recorded_at)
VALUES ('HELMET_001', 85, 'connected', 'normal', 'ok', 'connected', timezone('utc'::text, now()));

INSERT INTO public.helmet_locations (helmet_id, latitude, longitude, gps_valid, speed, recorded_at)
VALUES ('HELMET_001', 12.9716, 77.5946, true, 0.0, timezone('utc'::text, now()));
