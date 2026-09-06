export type StationStatus = 'active' | 'inactive' | 'maintenance';
export type ChargerStatus = 'available' | 'occupied' | 'offline' | 'maintenance';
export type ConnectorType = 'CCS2' | 'CHAdeMO' | 'Type 2';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyStationQuery extends Coordinates {
  radiusMeters: number;
}
