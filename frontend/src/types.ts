export type ChargerStatus = 'available' | 'reserved' | 'occupied' | 'offline' | 'maintenance';
export type PlugType = 'CCS2' | 'Type 2' | 'CHAdeMO';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Charger {
  id: string;
  stationId?: string;
  stationName?: string;
  name?: string;
  address: string;
  plugType: string;
  maxPowerKw: number;
  status: ChargerStatus;
  pricePerKwh: number;
  latitude: number;
  longitude: number;
  location?: Coordinates;
  distance_meters?: number;
  detourDistanceMeters?: number;
  distanceFromOriginMeters?: number;
}

export interface RoutePlanResponse {
  route: {
    origin: Coordinates;
    destination: Coordinates;
    distanceMeters: number;
    distanceKm: number;
    trajectory: [number, number][]; // [lng, lat][]
  };
  maxDetourMeters: number;
  totalChargers: number;
  chargers: Charger[];
}

export interface ReservationResponse {
  chargerId: string;
  userId: string;
  status: ChargerStatus;
}

