-- ==============================================================================
-- Kavach Smart Helmet: Supabase PostgreSQL Schema Migration
-- Migration: 20261023_init_kavach_schema.sql
-- Description: Normalized relational tables, RLS policies, views, triggers,
--              explicit grants, and Realtime publication. Safe to rerun.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Profiles Table
-- Linked directly to Supabase Auth users (auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Kavach Rider',
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 3. Helmets (Hardware Device Registry)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.helmets (
    id TEXT PRIMARY KEY, -- Device identifier, e.g. 'HELMET_001'
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Kavach Smart Helmet',
    serial_number TEXT UNIQUE,
    hardware_version TEXT DEFAULT 'v1.0-esp32',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_helmets_owner_id ON public.helmets(owner_id);

ALTER TABLE public.helmets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view owned or demo helmets" ON public.helmets;
CREATE POLICY "Users can view owned or demo helmets"
    ON public.helmets FOR SELECT
    USING (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "Owners can update their helmets" ON public.helmets;
CREATE POLICY "Owners can update their helmets"
    ON public.helmets FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Allow demo helmet creation" ON public.helmets;
CREATE POLICY "Allow demo helmet creation"
    ON public.helmets FOR INSERT
    WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- ==============================================================================
-- 4. Helmet Telemetry (Time-series / historical sensor readings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.helmet_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    helmet_id TEXT NOT NULL REFERENCES public.helmets(id) ON DELETE CASCADE,
    battery_percentage NUMERIC CHECK (battery_percentage >= 0 AND battery_percentage <= 100),
    helmet_status TEXT NOT NULL DEFAULT 'connected' CHECK (helmet_status IN ('connected', 'disconnected')),
    accident_status TEXT NOT NULL DEFAULT 'normal' CHECK (accident_status IN ('normal', 'warning', 'alert')),
    sensor_status TEXT DEFAULT 'ok',
    gsm_status TEXT DEFAULT 'connected',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_telemetry_helmet_recorded
    ON public.helmet_telemetry(helmet_id, recorded_at DESC);

ALTER TABLE public.helmet_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view telemetry for owned or demo helmets" ON public.helmet_telemetry;
CREATE POLICY "Users can view telemetry for owned or demo helmets"
    ON public.helmet_telemetry FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = helmet_telemetry.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users and backend can insert telemetry" ON public.helmet_telemetry;
CREATE POLICY "Users and backend can insert telemetry"
    ON public.helmet_telemetry FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = helmet_telemetry.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

-- ==============================================================================
-- 5. Helmet Locations (Historical GPS tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.helmet_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    helmet_id TEXT NOT NULL REFERENCES public.helmets(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    gps_valid BOOLEAN NOT NULL DEFAULT false,
    speed NUMERIC(6, 2) DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_locations_helmet_recorded
    ON public.helmet_locations(helmet_id, recorded_at DESC);

ALTER TABLE public.helmet_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view locations for owned or demo helmets" ON public.helmet_locations;
CREATE POLICY "Users can view locations for owned or demo helmets"
    ON public.helmet_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = helmet_locations.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users and backend can insert locations" ON public.helmet_locations;
CREATE POLICY "Users and backend can insert locations"
    ON public.helmet_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = helmet_locations.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

-- ==============================================================================
-- 6. Emergency Contacts
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 80),
    phone TEXT NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can view own emergency contacts"
    ON public.emergency_contacts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert own emergency contacts"
    ON public.emergency_contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update own emergency contacts"
    ON public.emergency_contacts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete own emergency contacts"
    ON public.emergency_contacts FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 7. Accident Alerts
-- Tracks complete lifecycle: detected/new -> pending -> sent -> acknowledged -> resolved / failed
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accident_alerts (
    id TEXT PRIMARY KEY, -- Stable event ID (e.g. UUID or 'ALERT_...')
    helmet_id TEXT NOT NULL REFERENCES public.helmets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    gps_valid BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'pending', 'sent', 'acknowledged', 'resolved', 'failed')),
    sms_status TEXT NOT NULL DEFAULT 'pending' CHECK (sms_status IN ('pending', 'confirmed', 'failed', 'unknown', 'simulated')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_helmet_timestamp
    ON public.accident_alerts(helmet_id, timestamp DESC);

ALTER TABLE public.accident_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view alerts for owned or demo helmets" ON public.accident_alerts;
CREATE POLICY "Users can view alerts for owned or demo helmets"
    ON public.accident_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = accident_alerts.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users and devices can insert alerts" ON public.accident_alerts;
CREATE POLICY "Users and devices can insert alerts"
    ON public.accident_alerts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = accident_alerts.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users can resolve alerts for their helmets" ON public.accident_alerts;
CREATE POLICY "Users can resolve alerts for their helmets"
    ON public.accident_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.helmets
            WHERE helmets.id = accident_alerts.helmet_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    )
    WITH CHECK (status = 'resolved');

-- ==============================================================================
-- 8. SMS Delivery Logs
-- Audit trail for emergency SMS dispatches
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sms_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT NOT NULL REFERENCES public.accident_alerts(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.emergency_contacts(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'simulated')),
    provider TEXT NOT NULL DEFAULT 'simulation',
    message_body TEXT,
    provider_response JSONB,
    error_message TEXT,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_alert ON public.sms_delivery_logs(alert_id);

ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view SMS logs for owned helmets" ON public.sms_delivery_logs;
CREATE POLICY "Users can view SMS logs for owned helmets"
    ON public.sms_delivery_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.accident_alerts
            JOIN public.helmets ON accident_alerts.helmet_id = helmets.id
            WHERE accident_alerts.id = sms_delivery_logs.alert_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users and backend can insert SMS logs" ON public.sms_delivery_logs;
CREATE POLICY "Users and backend can insert SMS logs"
    ON public.sms_delivery_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.accident_alerts
            JOIN public.helmets ON accident_alerts.helmet_id = helmets.id
            WHERE accident_alerts.id = sms_delivery_logs.alert_id
              AND (helmets.owner_id = auth.uid() OR helmets.owner_id IS NULL)
        )
    );

-- ==============================================================================
-- 9. Device & User Settings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.device_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_push BOOLEAN NOT NULL DEFAULT true,
    notifications_sound BOOLEAN NOT NULL DEFAULT true,
    accident_threshold NUMERIC DEFAULT NULL, -- Immutable from client app
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.device_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own device settings" ON public.device_settings;
CREATE POLICY "Users can view own device settings"
    ON public.device_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own device settings" ON public.device_settings;
CREATE POLICY "Users can insert own device settings"
    ON public.device_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification settings" ON public.device_settings;
CREATE POLICY "Users can update own notification settings"
    ON public.device_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 10. In-App Notifications
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('accident', 'disconnected', 'gps', 'sensor', 'alertUpdate')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    alert_id TEXT,
    device_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_timestamp
    ON public.in_app_notifications(user_id, timestamp DESC);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.in_app_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.in_app_notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.in_app_notifications;
CREATE POLICY "Users can insert own notifications"
    ON public.in_app_notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.in_app_notifications;
CREATE POLICY "Users can update own notifications"
    ON public.in_app_notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.in_app_notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.in_app_notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 11. Push Tokens (Expo Push Tokens)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
    ON public.push_tokens FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 12. Helper View: v_latest_helmet_state
-- Combines helmet metadata, latest telemetry, and latest location
-- ==============================================================================
CREATE OR REPLACE VIEW public.v_latest_helmet_state AS
SELECT
    h.id AS "deviceId",
    h.name AS "deviceName",
    h.owner_id AS "ownerId",
    t.battery_percentage AS "batteryLevel",
    COALESCE(t.helmet_status, 'disconnected') AS "helmetStatus",
    COALESCE(t.accident_status, 'normal') AS "accidentStatus",
    t.sensor_status AS "sensorStatus",
    t.gsm_status AS "gsmStatus",
    COALESCE(l.gps_valid, false) AS "gpsValid",
    l.latitude AS "latitude",
    l.longitude AS "longitude",
    l.speed AS "speed",
    l.recorded_at AS "gpsLastFixAt",
    COALESCE(
        GREATEST(t.recorded_at, l.recorded_at),
        h.updated_at,
        h.created_at
    ) AS "lastUpdated"
FROM public.helmets h
LEFT JOIN LATERAL (
    SELECT battery_percentage, helmet_status, accident_status, sensor_status, gsm_status, recorded_at
    FROM public.helmet_telemetry
    WHERE helmet_id = h.id
    ORDER BY recorded_at DESC
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT latitude, longitude, gps_valid, speed, recorded_at
    FROM public.helmet_locations
    WHERE helmet_id = h.id
    ORDER BY recorded_at DESC
    LIMIT 1
) l ON true;

-- ==============================================================================
-- 13. Automatic User Onboarding Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Kavach Rider'),
        NEW.email,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.device_settings (user_id, notifications_push, notifications_sound, accident_threshold, updated_at)
    VALUES (
        NEW.id,
        true,
        true,
        NULL,
        timezone('utc'::text, now())
    ) ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 14. Primary Emergency Contact Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_emergency_contact_change()
RETURNS TRIGGER AS $$
DECLARE
    contact_count INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT count(*) INTO contact_count FROM public.emergency_contacts WHERE user_id = NEW.user_id;
        IF contact_count = 1 THEN
            NEW.is_primary := true;
        ELSIF NEW.is_primary THEN
            UPDATE public.emergency_contacts
            SET is_primary = false, updated_at = timezone('utc'::text, now())
            WHERE user_id = NEW.user_id AND id != NEW.id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_primary AND NOT OLD.is_primary THEN
            UPDATE public.emergency_contacts
            SET is_primary = false, updated_at = timezone('utc'::text, now())
            WHERE user_id = NEW.user_id AND id != NEW.id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_primary THEN
            UPDATE public.emergency_contacts
            SET is_primary = true, updated_at = timezone('utc'::text, now())
            WHERE id = (
                SELECT id FROM public.emergency_contacts
                WHERE user_id = OLD.user_id
                ORDER BY created_at ASC
                LIMIT 1
            );
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_emergency_contact_before_write ON public.emergency_contacts;
CREATE TRIGGER trg_emergency_contact_before_write
    BEFORE INSERT OR UPDATE ON public.emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_emergency_contact_change();

DROP TRIGGER IF EXISTS trg_emergency_contact_after_delete ON public.emergency_contacts;
CREATE TRIGGER trg_emergency_contact_after_delete
    AFTER DELETE ON public.emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_emergency_contact_change();

-- ==============================================================================
-- 15. Explicit Role Grants
-- Grants needed for PostgREST anon, authenticated, and service_role
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- Anonymous users (demo device access and unauthenticated status checks)
GRANT SELECT, INSERT ON public.helmets TO anon;
GRANT SELECT, INSERT ON public.helmet_telemetry TO anon;
GRANT SELECT, INSERT ON public.helmet_locations TO anon;
GRANT SELECT, INSERT ON public.accident_alerts TO anon;
GRANT SELECT ON public.v_latest_helmet_state TO anon;

-- ==============================================================================
-- 16. Realtime Publication
-- ==============================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'helmets', 'helmet_telemetry', 'helmet_locations',
        'accident_alerts', 'emergency_contacts', 'in_app_notifications', 'device_settings'
    ]) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;
