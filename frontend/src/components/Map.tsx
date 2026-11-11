import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Charger, Coordinates, RoutePlanResponse } from '../types';
import { Zap, Navigation, Clock, BatteryCharging } from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   Custom DivIcon Factories (Glowing Cyber-EV style)
   ════════════════════════════════════════════════════════════ */

const createUserIcon = () =>
  L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <div class="user-pulse-ring" style="position:absolute;width:36px;height:36px;border-radius:9999px;background:rgba(6,182,212,0.35);"></div>
        <div style="width:16px;height:16px;border-radius:9999px;background:linear-gradient(135deg,#06b6d4,#3b82f6);border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 0 12px rgba(6,182,212,0.6);z-index:10;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const createChargerIcon = (status: string, isSelected: boolean, powerKw: number) => {
  const isAvailable = status === 'available';
  const isReserved = status === 'reserved';

  const bg = isAvailable
    ? 'linear-gradient(135deg,#10b981,#059669)'
    : isReserved
      ? 'linear-gradient(135deg,#f59e0b,#d97706)'
      : 'linear-gradient(135deg,#ef4444,#dc2626)';

  const glowClass = isAvailable
    ? 'charger-glow-available'
    : isReserved
      ? 'charger-glow-reserved'
      : '';

  const borderCol = isSelected ? 'rgba(6,182,212,0.9)' : 'rgba(255,255,255,0.25)';
  const scale = isSelected ? 'scale(1.25)' : 'scale(1)';
  const selectGlow = isSelected ? '0 0 18px rgba(6,182,212,0.5),' : '';

  return L.divIcon({
    className: 'custom-charger-marker',
    html: `
      <div style="transform:${scale};transition:all 0.25s cubic-bezier(0.4,0,0.2,1);cursor:pointer;">
        <div class="${glowClass}" style="
          min-width:40px;height:38px;padding:0 6px;
          background:${bg};
          border:2px solid ${borderCol};
          border-radius:10px;
          display:flex;align-items:center;justify-content:center;gap:3px;
          box-shadow:${selectGlow} 0 6px 20px rgba(0,0,0,0.4);
          color:white;font-weight:700;font-size:10px;
          backdrop-filter:blur(4px);
        ">
          <span style="font-size:12px;">⚡</span>${powerKw}kW
        </div>
        <div style="
          position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:6px solid transparent;border-right:6px solid transparent;
          border-top:6px solid ${isAvailable ? '#059669' : isReserved ? '#d97706' : '#dc2626'};
          filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    iconSize: [40, 44],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const createEndpointIcon = (label: string, color: string, glowColor: string) =>
  L.divIcon({
    className: 'custom-endpoint-marker',
    html: `
      <div style="
        background:${color};
        color:white;
        padding:5px 10px;
        border-radius:8px;
        font-weight:800;font-size:11px;letter-spacing:0.02em;
        border:2px solid rgba(255,255,255,0.3);
        box-shadow:0 0 16px ${glowColor}, 0 6px 20px rgba(0,0,0,0.4);
        white-space:nowrap;
        backdrop-filter:blur(6px);
      ">
        ${label}
      </div>
    `,
    iconSize: [50, 28],
    iconAnchor: [25, 28],
  });

/* ════════════════════════════════════════════════════════════ */

interface MapProps {
  userLocation: Coordinates;
  chargers: Charger[];
  selectedCharger: Charger | null;
  onSelectCharger: (charger: Charger) => void;
  onOpenReserveModal: (charger: Charger) => void;
  routePlan: RoutePlanResponse | null;
  osrmPolyline?: [number, number][] | null;
}

function MapViewController({
  routePlan,
  osrmPolyline,
  selectedCharger,
  userLocation,
}: {
  routePlan: RoutePlanResponse | null;
  osrmPolyline?: [number, number][] | null;
  selectedCharger: Charger | null;
  userLocation: Coordinates;
}) {
  const map = useMap();

  // Re-center when geolocation updates (startup auto-center)
  useEffect(() => {
    map.flyTo([userLocation.latitude, userLocation.longitude], 13, { duration: 1 });
  }, [map, userLocation]);

  useEffect(() => {
    if (routePlan) {
      const bounds = L.latLngBounds([
        [routePlan.route.origin.latitude, routePlan.route.origin.longitude],
        [routePlan.route.destination.latitude, routePlan.route.destination.longitude],
      ]);
      if (osrmPolyline && osrmPolyline.length > 0) {
        osrmPolyline.forEach(([lat, lng]) => bounds.extend([lat, lng]));
      }
      routePlan.chargers.forEach((c) => {
        bounds.extend([c.latitude, c.longitude]);
      });
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else if (selectedCharger) {
      map.flyTo([selectedCharger.latitude, selectedCharger.longitude], 15, {
        duration: 1.2,
      });
    }
  }, [map, routePlan, osrmPolyline, selectedCharger]);

  return null;
}

export const Map: React.FC<MapProps> = ({
  userLocation,
  chargers,
  selectedCharger,
  onSelectCharger,
  onOpenReserveModal,
  routePlan,
  osrmPolyline,
}) => {
  // Fallback straight-line trajectory from backend PostGIS response
  const straightLinePositions: [number, number][] = routePlan
    ? [
      [routePlan.route.origin.latitude, routePlan.route.origin.longitude],
      ...(routePlan.route.trajectory.map(
        (coord) => [coord[1], coord[0]] as [number, number]
      )),
      [routePlan.route.destination.latitude, routePlan.route.destination.longitude],
    ]
    : [];

  // Prefer OSRM road-snapped coords; fall back to straight-line trajectory
  const polylinePositions: [number, number][] =
    osrmPolyline && osrmPolyline.length > 0 ? osrmPolyline : straightLinePositions;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[userLocation.latitude, userLocation.longitude]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController
          routePlan={routePlan}
          osrmPolyline={osrmPolyline}
          selectedCharger={selectedCharger}
          userLocation={userLocation}
        />

        {/* User Location Pulse Pin */}
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={createUserIcon()}
        >
          <Popup>
            <div className="p-1.5 text-xs">
              <span className="font-bold text-cyan-400">Your Location</span>
              <p className="text-slate-400 mt-0.5 font-mono text-[11px]">
                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Route Polyline and Origin/Destination Pins */}
        {routePlan && (
          <>
            {/* Glow underlay */}
            <Polyline
              positions={polylinePositions}
              color="#06b6d4"
              weight={10}
              opacity={0.2}
              lineCap="round"
              lineJoin="round"
            />
            {/* Main line */}
            <Polyline
              positions={polylinePositions}
              color="#06b6d4"
              weight={4}
              opacity={0.9}
              lineCap="round"
              lineJoin="round"
              dashArray="12 6"
            />
            {/* Origin Marker */}
            <Marker
              position={[routePlan.route.origin.latitude, routePlan.route.origin.longitude]}
              icon={createEndpointIcon('⚡ START', 'linear-gradient(135deg,#10b981,#059669)', 'rgba(16,185,129,0.4)')}
            />
            {/* Destination Marker */}
            <Marker
              position={[
                routePlan.route.destination.latitude,
                routePlan.route.destination.longitude,
              ]}
              icon={createEndpointIcon('🏁 END', 'linear-gradient(135deg,#ef4444,#dc2626)', 'rgba(239,68,68,0.4)')}
            />
          </>
        )}

        {/* Charger Markers */}
        {chargers.map((charger) => {
          const isSelected = selectedCharger?.id === charger.id;
          const power = charger.maxPowerKw || 50;

          return (
            <Marker
              key={charger.id}
              position={[charger.latitude, charger.longitude]}
              icon={createChargerIcon(charger.status, isSelected, power)}
              eventHandlers={{
                click: () => onSelectCharger(charger),
              }}
            >
              <Popup className="charger-popup">
                <div className="p-2.5 max-w-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-2 mb-2">
                    <span className="font-bold text-sm text-slate-100">
                      {charger.name || charger.stationName || 'EV Station'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${charger.status === 'available'
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                        : charger.status === 'reserved'
                          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                          : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                        }`}
                    >
                      {charger.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                    {charger.address}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mb-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/40">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{charger.plugType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{charger.maxPowerKw} kW</span>
                    </div>
                    {charger.detourDistanceMeters !== undefined && (
                      <div className="flex items-center gap-1 col-span-2 text-cyan-300 font-medium">
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Detour: {Math.round(charger.detourDistanceMeters)}m</span>
                      </div>
                    )}
                  </div>

                  {charger.status === 'available' ? (
                    <button
                      onClick={() => onOpenReserveModal(charger)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Reserve Charger
                    </button>
                  ) : (
                    <div className="text-center text-[11px] text-slate-500 font-medium py-1.5 bg-slate-800/30 rounded-lg">
                      Slot currently unavailable
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
