import type { Request, Response } from 'express';
import { findNearbyStations, getNearbyChargers } from '../services/stationService.js';

interface NearbyStationQuery {
  lat: string;
  lng: string;
  radius_km?: string;
}

interface NearbyChargerQuery {
  lat?: string;
  lng?: string;
  radius?: string;
}

export async function handleGetNearbyChargers(
  request: Request<unknown, unknown, unknown, NearbyChargerQuery>,
  response: Response
) {
  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lng);
  const radiusInMeters = Number(request.query.radius);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusInMeters)
  ) {
    return response.status(400).json({ error: 'lat, lng, and radius must be valid numbers' });
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    radiusInMeters <= 0
  ) {
    return response.status(400).json({ error: 'coordinates or radius are outside valid ranges' });
  }

  const stations = await getNearbyChargers(latitude, longitude, radiusInMeters);
  return response.json(stations);
}

export async function nearbyStationsController(
  request: Request<unknown, unknown, unknown, Partial<NearbyStationQuery>>,
  response: Response
) {
  const latitude = Number(request.query.lat ?? 12.9716);
  const longitude = Number(request.query.lng ?? 77.5946);
  const radiusKm = Number(request.query.radius_km ?? 10);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusKm)) {
    return response.status(400).json({ error: 'lat, lng, and radius_km must be valid numbers' });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || radiusKm <= 0) {
    return response.status(400).json({ error: 'coordinates or radius are outside valid ranges' });
  }
  const stations = await findNearbyStations({ latitude, longitude, radiusMeters: radiusKm * 1000 });
  return response.json(stations);
}
