import axios from 'axios';
import type { Charger, ReservationResponse, RoutePlanResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export async function fetchNearbyChargers(
  lat: number,
  lng: number,
  radiusMeters: number = 5000
): Promise<Charger[]> {
  const response = await apiClient.get<Charger[]>('/chargers/nearby', {
    params: {
      lat,
      lng,
      radius: radiusMeters,
    },
  });

  return response.data.map((item) => ({
    ...item,
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    distance_meters: item.distance_meters !== undefined ? Number(item.distance_meters) : undefined,
  }));
}

export async function reserveCharger(
  chargerId: string,
  userId: string
): Promise<ReservationResponse> {
  const response = await apiClient.post<ReservationResponse>(
    `/chargers/${chargerId}/reserve`,
    { userId }
  );
  return response.data;
}

export async function releaseCharger(
  chargerId: string,
  userId: string
): Promise<ReservationResponse> {
  const response = await apiClient.post<ReservationResponse>(
    `/chargers/${chargerId}/release`,
    { userId }
  );
  return response.data;
}

export async function fetchOsrmRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
  const response = await axios.get<{
    routes: Array<{ geometry: { coordinates: [number, number][] } }>;
  }>(url);
  // OSRM returns [lng, lat]; convert to Leaflet's [lat, lng]
  return response.data.routes[0].geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
  );
}

export async function planRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  maxDetourMeters: number = 5000
): Promise<RoutePlanResponse> {
  const response = await apiClient.post<RoutePlanResponse>('/routes/plan', {
    originLat,
    originLng,
    destLat,
    destLng,
    maxDetourMeters,
  });

  const data = response.data;
  return {
    ...data,
    chargers: (data.chargers || []).map((c) => ({
      ...c,
      latitude: Number(c.location?.latitude ?? c.latitude),
      longitude: Number(c.location?.longitude ?? c.longitude),
      maxPowerKw: Number(c.maxPowerKw),
      pricePerKwh: Number(c.pricePerKwh),
      detourDistanceMeters: Number(c.detourDistanceMeters),
      distanceFromOriginMeters: Number(c.distanceFromOriginMeters),
    })),
  };
}

