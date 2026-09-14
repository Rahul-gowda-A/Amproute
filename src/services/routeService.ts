import { pool } from '../config/db.js';
import type { RoutePlanRequest, RoutePlanResponse, RouteWaypoint } from '../types/domain.js';

const EARTH_RADIUS_KM = 6371;
const CORRIDOR_RADIUS_METERS = 10000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistanceKm(origin: RoutePlanRequest['origin'], destination: RoutePlanRequest['destination']): number {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
        CORRIDOR_RADIUS_METERS
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
    waypoints
  };
}