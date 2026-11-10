import type { Request, Response } from 'express';
import { findNearbyStations, getNearbyChargers } from '../services/stationService.js';
import {
  nearbyChargersQuerySchema,
  nearbyStationsQuerySchema,
} from '../validators/schemas.js';

export async function handleGetNearbyChargers(request: Request, response: Response) {
  const parseResult = nearbyChargersQuerySchema.safeParse(request.query);

  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.issues.map((i) => i.message).join(', ') ||
      'coordinates or radius are outside valid ranges';
    return response.status(400).json({
      error: errorMsg,
      issues: parseResult.error.issues,
    });
  }

  const { lat, lng, radius } = parseResult.data;
  const stations = await getNearbyChargers(lat, lng, radius);
  return response.json(stations);
}

export async function nearbyStationsController(request: Request, response: Response) {
  const parseResult = nearbyStationsQuerySchema.safeParse(request.query);

  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.issues.map((i) => i.message).join(', ') ||
      'coordinates or radius are outside valid ranges';
    return response.status(400).json({
      error: errorMsg,
      issues: parseResult.error.issues,
    });
  }

  const { lat, lng, radius_km } = parseResult.data;
  const stations = await findNearbyStations({
    latitude: lat,
    longitude: lng,
    radiusMeters: radius_km * 1000,
  });
  return response.json(stations);
}
