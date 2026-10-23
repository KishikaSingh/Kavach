import pg from 'pg';

const connectionString =
  process.env.SUPABASE_DB_URL ||
  'postgresql://postgres:%3F8T%24%2B5uSqMuwskH@db.dcgybpninduaacnarytf.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  const updateSql = `
    DROP VIEW IF EXISTS public.v_latest_helmet_state CASCADE;

    CREATE VIEW public.v_latest_helmet_state AS
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

    GRANT SELECT ON public.v_latest_helmet_state TO anon, authenticated, service_role;

    INSERT INTO public.helmets (id, name, serial_number, hardware_version, created_at, updated_at)
    VALUES (
        'KAVACH-HLM-01',
        'Kavach Smart Helmet (HLM-01)',
        'KVH-ESP32-HLM-001',
        'v1.0-esp32',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = timezone('utc'::text, now());

    INSERT INTO public.helmet_telemetry (helmet_id, battery_percentage, helmet_status, accident_status, sensor_status, gsm_status, recorded_at)
    VALUES ('KAVACH-HLM-01', 85, 'connected', 'normal', 'ok', 'connected', timezone('utc'::text, now()));

    INSERT INTO public.helmet_locations (helmet_id, latitude, longitude, gps_valid, speed, recorded_at)
    VALUES ('KAVACH-HLM-01', 12.9716, 77.5946, true, 0.0, timezone('utc'::text, now()));
  `;

  await client.query(updateSql);
  console.log('View updated and KAVACH-HLM-01 alias registered successfully!');

  const viewRows = await client.query('SELECT * FROM public.v_latest_helmet_state;');
  console.log('Current view rows:', viewRows.rows);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
