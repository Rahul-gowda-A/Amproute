import { pool } from './index.js';
import { config } from '../config/env.js';
import type { ConnectorType } from '../types/domain.js';

const chargerOptions: Array<{ plugType: ConnectorType; powerKw: number }> = [
  { plugType: 'CCS2', powerKw: 150 },
  { plugType: 'CCS2', powerKw: 50 },
  { plugType: 'CHAdeMO', powerKw: 50 },
  { plugType: 'Type 2', powerKw: 22 },
];

const stationPrefixes = ['GreenCharge', 'VoltWay', 'ChargeGrid', 'IonPoint', 'SparkRoute'];
const districts = ['Central', 'North', 'East', 'South', 'West'];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function runSeed(truncate = false): Promise<void> {
  const client = await pool.connect();
  try {
    if (truncate) {
      console.log('Clearing old station and charger data...');
      await client.query('TRUNCATE TABLE chargers, stations RESTART IDENTITY CASCADE');
    }

    const stationCount = config.SEED_STATION_COUNT || 100;
    console.log(`Seeding ${stationCount} stations with spatial coordinates...`);
    await client.query('BEGIN');

    for (let index = 1; index <= stationCount; index += 1) {
      const distanceMeters = Math.sqrt(Math.random()) * config.SEED_RADIUS_M;
      const bearingRadians = Math.random() * 2 * Math.PI;

      const stationResult = await client.query<{ id: string; location: string }>(
        `INSERT INTO stations (name, address, location)
         VALUES ($1, $2,
           ST_Project(
             ST_SetSRID(ST_MakePoint($4::float8, $3::float8), 4326)::geography,
             $5::float8,
             $6::float8
           )
         )
         RETURNING id, location`,
        [
          `${randomItem(stationPrefixes)}${index}`,
          `${Math.floor(Math.random() * 300) + 1} ${randomItem(districts)} Avenue, Bengaluru`,
          config.SEED_CENTER_LAT,
          config.SEED_CENTER_LON,
          distanceMeters,
          bearingRadians,
        ]
      );

      const stationId = stationResult.rows[0].id;
      const stationLocation = stationResult.rows[0].location;
      const chargerCount = 2 + Math.floor(Math.random() * 3);

      for (let chargerIndex = 1; chargerIndex <= chargerCount; chargerIndex += 1) {
        const charger = randomItem(chargerOptions);
        await client.query(
          `INSERT INTO chargers (station_id, plug_type, max_power_kw, price_per_kwh, location)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            stationId,
            charger.plugType,
            charger.powerKw,
            charger.powerKw >= 100 ? 18.5 : 14.5,
            stationLocation,
          ]
        );
      }

      if (index % 50 === 0 || index === stationCount) {
        console.log(`Seed progress: ${index}/${stationCount} stations created...`);
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function seedIfEmpty(): Promise<boolean> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM stations');
    const count = parseInt(res.rows[0]?.count || '0', 10);
    if (count === 0) {
      console.log('Database is empty. Populating initial EV charging station data...');
      await runSeed(false);
      return true;
    }
    console.log(`Database already populated (${count} stations found). Skipping auto-seed.`);
    return false;
  } catch (err) {
    console.warn('Auto-seed check encountered an issue:', err);
    return false;
  } finally {
    client.release();
  }
}

// If executed directly from CLI: tsx src/db/seed.ts
if (process.argv[1]?.includes('seed')) {
  runSeed(true)
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('CLI Seed failed:', err);
      await pool.end();
      process.exit(1);
    });
}
