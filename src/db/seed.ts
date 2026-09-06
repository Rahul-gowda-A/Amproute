import { config } from '../config/env.js';
import { pool } from '../config/db.js';
import type { ConnectorType } from '../types/domain.js';

const chargerOptions: Array<{ plugType: ConnectorType; powerKw: number }> = [
  { plugType: 'CCS2', powerKw: 150 },
  { plugType: 'CCS2', powerKw: 50 },
  { plugType: 'CHAdeMO', powerKw: 50 },
  { plugType: 'Type 2', powerKw: 22 }
];

const stationPrefixes = ['GreenCharge', 'VoltWay', 'ChargeGrid', 'IonPoint', 'SparkRoute'];
const districts = ['Central', 'North', 'East', 'South', 'West'];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('Clearing old data...');
    await client.query('TRUNCATE TABLE chargers, stations RESTART IDENTITY CASCADE');

    console.log(`Seeding ${config.SEED_STATION_COUNT} stations in batch...`);
    await client.query('BEGIN');

    for (let index = 1; index <= config.SEED_STATION_COUNT; index += 1) {
      const distanceMeters = Math.sqrt(Math.random()) * config.SEED_RADIUS_M;
      const bearingRadians = Math.random() * 2 * Math.PI;

      const stationResult = await client.query<{ id: string }>(
        `INSERT INTO stations (name, address, location)
         VALUES ($1, $2,
           ST_Project(
             ST_SetSRID(ST_MakePoint($4::float8, $3::float8), 4326)::geography,
             $5::float8,
             $6::float8
           )
         )
         RETURNING id`,
        [
          `${randomItem(stationPrefixes)}${index}`,
          `${Math.floor(Math.random() * 300) + 1}${randomItem(districts)} Avenue, Bengaluru`,
          config.SEED_CENTER_LAT,
          config.SEED_CENTER_LON,
          distanceMeters,
          bearingRadians
        ]
      );

      const stationId = stationResult.rows[0].id;
      const chargerCount = 2 + Math.floor(Math.random() * 3);

      for (let chargerIndex = 1; chargerIndex <= chargerCount; chargerIndex += 1) {
        const charger = randomItem(chargerOptions);
        await client.query(
          `INSERT INTO chargers (station_id, plug_type, max_power_kw, price_per_kwh)
           VALUES ($1, $2, $3, $4)`,
          [stationId, charger.plugType, charger.powerKw, charger.powerKw >= 100 ? 18.5 : 14.5]
        );
      }

      if (index % 100 === 0) {
        console.log(`Progress: ${index}/${config.SEED_STATION_COUNT} stations created...`);
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();