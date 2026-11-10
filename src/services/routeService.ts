import { pool } from '../config/db.js';
import type {
  PlanRouteResult,
  RouteCharger,
  RoutePlanRequest,
  RoutePlanResponse,
  RouteWaypoint,
} from '../types/domain.js';

const EARTH_RADIUS_KM = 6371;
const CORRIDOR_RADIUS_METERS = 10000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): number {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Plans a route between origin and destination coordinates, finding chargers
 * within maxDetourMeters using PostGIS ST_DWithin on the route trajectory corridor.
 */
export async function planRouteWithChargers(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  maxDetourMeters: number = 5000
): Promise<PlanRouteResult> {
  const distanceKm = haversineDistanceKm(
    { latitude: originLat, longitude: originLng },
    { latitude: destLat, longitude: destLng }
  );
  const distanceMeters = Math.round(distanceKm * 1000);

  const query = `
    WITH route AS (
      SELECT
        ST_SetSRID(
          ST_MakeLine(
            ST_MakePoint($2::float8, $1::float8),
            ST_MakePoint($4::float8, $3::float8)
          ),
          4326
        )::geography AS corridor,
        ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography AS origin_pt
    )
    SELECT
      c.id,
      c.station_id AS "stationId",
      s.name AS "stationName",
      s.address,
      c.plug_type AS "plugType",
      c.max_power_kw AS "maxPowerKw",
      c.status,
      c.price_per_kwh AS "pricePerKwh",
      ST_Y(s.location::geometry) AS latitude,
      ST_X(s.location::geometry) AS longitude,
      ST_Distance(s.location, route.corridor) AS "detourDistanceMeters",
      ST_Distance(s.location, route.origin_pt) AS "distanceFromOriginMeters"
    FROM stations s
    JOIN chargers c ON c.station_id = s.id
    CROSS JOIN route
    WHERE ST_DWithin(s.location, route.corridor, $5::float8)
    ORDER BY "distanceFromOriginMeters" ASC, "detourDistanceMeters" ASC
  `;

  const result = await pool.query(query, [
    originLat,
    originLng,
    destLat,
    destLng,
    maxDetourMeters,
  ]);

  const chargers: RouteCharger[] = result.rows.map((row) => ({
    id: row.id,
    stationId: row.stationId,
    stationName: row.stationName,
    address: row.address,
    plugType: row.plugType,
    maxPowerKw: Number(row.maxPowerKw),
    status: row.status,
    pricePerKwh: Number(row.pricePerKwh),
    location: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },
    detourDistanceMeters: Math.round(Number(row.detourDistanceMeters) * 100) / 100,
    distanceFromOriginMeters: Math.round(Number(row.distanceFromOriginMeters) * 100) / 100,
  }));

  return {
    route: {
      origin: { latitude: originLat, longitude: originLng },
      destination: { latitude: destLat, longitude: destLng },
      distanceMeters,
      distanceKm: Number(distanceKm.toFixed(2)),
      trajectory: [
        [originLng, originLat],
        [destLng, destLat],
      ],
    },
    maxDetourMeters,
    totalChargers: chargers.length,
    chargers,
  };
}

export async function calculateEVRoute(plan: RoutePlanRequest): Promise<RoutePlanResponse> {
  const totalDistanceKm = haversineDistanceKm(plan.origin, plan.destination);
  const usableRangeKm = plan.maxRangeKm * (plan.currentBatteryPct / 100);
  const chargingRequired = totalDistanceKm > usableRangeKm;
  let waypoints: RouteWaypoint[] = [];

  if (chargingRequired) {
    const result = await pool.query<RouteWaypoint>(
      `WITH route AS (
         SELECT ST_SetSRID(
           ST_MakeLine(
             ST_MakePoint($2::float8, $1::float8),
             ST_MakePoint($4::float8, $3::float8)
           ),
           4326
         )::geography AS corridor,
         ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography AS origin
       )
       SELECT s.id AS "stationId",
              s.name,
              s.address,
              ST_Y(s.location::geometry) AS latitude,
              ST_X(s.location::geometry) AS longitude,
              ST_Distance(s.location, route.origin) / 1000 AS "distanceFromOriginKm"
       FROM stations s
       CROSS JOIN route
       WHERE ST_DWithin(s.location, route.corridor, $5::float8)
       ORDER BY ST_Distance(s.location, route.origin) ASC
       LIMIT 3`,
      [
        plan.origin.latitude,
        plan.origin.longitude,
        plan.destination.latitude,
        plan.destination.longitude,
        CORRIDOR_RADIUS_METERS,
      ]
    );
    waypoints = result.rows;
  }

  return {
    origin: plan.origin,
    destination: plan.destination,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    usableRangeKm: Number(usableRangeKm.toFixed(2)),
    chargingRequired,
    waypoints,
  };
}
