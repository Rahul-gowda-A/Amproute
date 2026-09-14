export type StationStatus = 'active' | 'inactive' | 'maintenance';
export type ChargerStatus = 'available' | 'reserved' | 'occupied' | 'offline' | 'maintenance';
export type ConnectorType = 'CCS2' | 'CHAdeMO' | 'Type 2';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyStationQuery extends Coordinates {
  radiusMeters: number;
}

export interface RoutePlanRequest {
  origin: Coordinates;
  destination: Coordinates;
  currentBatteryPct: number;
  batteryCapacityKwh: number;
  maxRangeKm: number;
}

export interface RouteWaypoint extends Coordinates {
  stationId: string;
  name: string;
  address: string;
  distanceFromOriginKm: number;
}

export interface RoutePlanResponse {
  origin: Coordinates;
  destination: Coordinates;
  totalDistanceKm: number;
  usableRangeKm: number;
  chargingRequired: boolean;
  waypoints: RouteWaypoint[];
}

export interface ReserveChargerRequest {
  userId: string;
}

export interface ReleaseChargerRequest {
  userId: string;
}

export interface ReservationResponse {
  chargerId: string;
  userId: string;
  status: ChargerStatus;
}

export interface ChargerLockRequest {
  chargerId: string;
  userId: string;
}
