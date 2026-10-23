import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from root .env
const rootEnvPath = path.join(rootDir, '.env');
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const connectionString =
  process.env.SUPABASE_DB_URL ||
  'postgresql://postgres:%3F8T%24%2B5uSqMuwskH@db.dcgybpninduaacnarytf.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Connecting to Supabase PostgreSQL database...');
  await client.connect();
  console.log('Connected successfully!');

  const migrationFile = path.join(rootDir, 'supabase', 'migrations', '20261023_init_kavach_schema.sql');
  const seedFile = path.join(rootDir, 'supabase', 'seed.sql');

  console.log(`Applying migration: ${migrationFile}`);
  const migrationSql = fs.readFileSync(migrationFile, 'utf8');
  await client.query(migrationSql);
  console.log('Migration applied successfully!');

  console.log(`Applying seed data: ${seedFile}`);
  const seedSql = fs.readFileSync(seedFile, 'utf8');
  await client.query(seedSql);
  console.log('Seed data applied successfully!');

  console.log('\nVerifying public tables:');
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;");
  console.log('Tables in public schema:', res.rows.map((r) => r.tablename));

  console.log('\nVerifying demo helmet in helmets table:');
  const helmetRes = await client.query("SELECT * FROM public.helmets WHERE id = 'HELMET_001';");
  console.log('Demo helmet record:', helmetRes.rows[0]);

  console.log('\nVerifying latest helmet state view:');
  const viewRes = await client.query("SELECT * FROM public.v_latest_helmet_state WHERE \"deviceId\" = 'HELMET_001';");
  console.log('View output:', viewRes.rows[0]);

  await client.end();
  console.log('\nDatabase setup verified successfully!');
}

main().catch((err) => {
  console.error('Error applying migration:', err);
  process.exit(1);
});
