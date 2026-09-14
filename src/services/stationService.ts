import { pool } from '../config/db.js';
import type { NearbyStationQuery } from '../types/domain.js';

export async function getNearbyChargers(
  latitude: number,
  longitude: number,
  radiusInMeters: number
) {
  const result = await pool.query(
    `SELECT id, name, address,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            ST_Distance(
              location,
              ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
            ) AS distance_meters
     FROM stations
     WHERE ST_DWithin(
         location,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
     ORDER BY distance_meters ASC`,
    [latitude, longitude, radiusInMeters]
  );

  return result.rows;
}

export async function findNearbyStations(query: NearbyStationQuery) {
  // Debug log to verify database count
  const countRes = await pool.query('SELECT COUNT(*) FROM stations');
  console.log('Total stations in database:', countRes.rows[0].count);

  return getNearbyChargers(query.latitude, query.longitude, query.radiusMeters);
}