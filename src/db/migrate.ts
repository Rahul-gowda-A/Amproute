import { pool } from './index.js';

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stations_location
  ON stations USING GIST (location);

CREATE TABLE IF NOT EXISTS chargers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  plug_type TEXT NOT NULL CHECK (plug_type IN ('CCS2', 'Type 2', 'CHAdeMO')),
  max_power_kw NUMERIC(6, 2) NOT NULL CHECK (max_power_kw > 0),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'occupied', 'offline', 'maintenance')),
  reserved_by UUID,
  location GEOGRAPHY(Point, 4326),
  price_per_kwh NUMERIC(8, 4) NOT NULL CHECK (price_per_kwh >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure location column and spatial index exist on chargers
ALTER TABLE chargers ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);
CREATE INDEX IF NOT EXISTS chargers_location_idx ON chargers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_chargers_station_id ON chargers (station_id);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  charger_id UUID NOT NULL REFERENCES chargers(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_reservations_charger_time
  ON reservations (charger_id, start_time, end_time);

ALTER TABLE chargers DROP CONSTRAINT IF EXISTS chargers_status_check;
ALTER TABLE chargers ADD CONSTRAINT chargers_status_check
  CHECK (status IN ('available', 'reserved', 'occupied', 'offline', 'maintenance'));

ALTER TABLE chargers ADD COLUMN IF NOT EXISTS reserved_by UUID;

-- Backfill charger locations from parent stations where missing
UPDATE chargers c
SET location = s.location
FROM stations s
WHERE c.station_id = s.id AND c.location IS NULL;
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');
    console.log('Database migrations applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// If executed directly from CLI: tsx src/db/migrate.ts
if (process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(async () => {
      console.log('Migration completed.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration execution failed:', err);
      await pool.end();
      process.exit(1);
    });
}
