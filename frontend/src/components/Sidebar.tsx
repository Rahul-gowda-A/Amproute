import React, { useState, useEffect } from 'react';
import type { Charger, Coordinates, ReservationResponse, RoutePlanResponse } from '../types';
import {
  Compass,
  Route,
  Zap,
  Sliders,
  Loader2,
  Clock,
  Unlock,
  Navigation,
  BatteryCharging,
  Info,
  Locate,
} from 'lucide-react';

interface SidebarProps {
  userLocation: Coordinates;
  onUpdateUserLocation: (coords: Coordinates) => void;
  chargers: Charger[];
  selectedCharger: Charger | null;
  onSelectCharger: (charger: Charger) => void;
  onOpenReserveModal: (charger: Charger) => void;
  onSearchNearby: (radiusMeters: number) => Promise<void>;
  onPlanRoute: (
    origin: Coordinates,
    destination: Coordinates,
    maxDetour: number
  ) => Promise<void>;
  routePlan: RoutePlanResponse | null;
  onClearRoute: () => void;
  activeReservation: ReservationResponse | null;
  onReleaseReservation: () => Promise<void>;
  isOpen: boolean;
  onToggleOpen: () => void;
  loading: boolean;
  originLat?: string;
  originLng?: string;
  destLat?: string;
  destLng?: string;
  onOriginLatChange?: (val: string) => void;
  onOriginLngChange?: (val: string) => void;
  onDestLatChange?: (val: string) => void;
  onDestLngChange?: (val: string) => void;
}

/* ── Skeleton shimmer cards ─────────────────────────────────── */
const SkeletonCard: React.FC = () => (
  <div className="p-3.5 rounded-xl border border-slate-700/40 bg-slate-800/30 space-y-2.5">
    <div className="skeleton h-3 w-3/4"></div>
    <div className="skeleton h-2.5 w-1/2"></div>
    <div className="flex gap-2 mt-2">
      <div className="skeleton h-5 w-16 rounded-full"></div>
      <div className="skeleton h-5 w-14 rounded-full"></div>
    </div>
    <div className="skeleton h-7 w-full rounded-lg mt-1"></div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  userLocation,
  onUpdateUserLocation,
  chargers,
  selectedCharger,
  onSelectCharger,
  onOpenReserveModal,
  onSearchNearby,
  onPlanRoute,
  routePlan,
  onClearRoute,
  activeReservation,
  onReleaseReservation,
  isOpen,
  onToggleOpen,
  loading,
  originLat,
  originLng,
  destLat,
  destLng,
  onOriginLatChange,
  onOriginLngChange,
  onDestLatChange,
  onDestLngChange,
}) => {
  const [activeTab, setActiveTab] = useState<'nearby' | 'route'>('nearby');
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [maxDetourMeters, setMaxDetourMeters] = useState<number>(5000);
  const [releasing, setReleasing] = useState<boolean>(false);

  // Internal state if props are not provided or initially empty
  const [internalOriginLat, setInternalOriginLat] = useState<string>('');
  const [internalOriginLng, setInternalOriginLng] = useState<string>('');
  const [internalDestLat, setInternalDestLat] = useState<string>('');
  const [internalDestLng, setInternalDestLng] = useState<string>('');

  const currentOriginLat = originLat !== undefined && originLat !== '' ? originLat : internalOriginLat;
  const currentOriginLng = originLng !== undefined && originLng !== '' ? originLng : internalOriginLng;
  const currentDestLat = destLat !== undefined && destLat !== '' ? destLat : internalDestLat;
  const currentDestLng = destLng !== undefined && destLng !== '' ? destLng : internalDestLng;

  const setOriginLatValue = (val: string) => {
    setInternalOriginLat(val);
    onOriginLatChange?.(val);
  };

  const setOriginLngValue = (val: string) => {
    setInternalOriginLng(val);
    onOriginLngChange?.(val);
  };

  const setDestLatValue = (val: string) => {
    setInternalDestLat(val);
    onDestLatChange?.(val);
  };

  const setDestLngValue = (val: string) => {
    setInternalDestLng(val);
    onDestLngChange?.(val);
  };

  // 1. On load, attempt to fetch the browser's live geolocation instead of hardcoded coordinates
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toString();
          const lng = pos.coords.longitude.toString();
          setOriginLatValue(lat);
          setOriginLngValue(lng);
          onUpdateUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation unavailable on initial load, falling back to default:', err.message);
          if (!currentOriginLat) setOriginLatValue(userLocation.latitude.toString());
          if (!currentOriginLng) setOriginLngValue(userLocation.longitude.toString());
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      if (!currentOriginLat) setOriginLatValue(userLocation.latitude.toString());
      if (!currentOriginLng) setOriginLngValue(userLocation.longitude.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fully wire up "Use GPS as Start" button to grab current browser position
  const handleUseCurrentLocationForOrigin = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setOriginLatValue(lat.toString());
          setOriginLngValue(lng.toString());
          onUpdateUserLocation({ latitude: lat, longitude: lng });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setOriginLatValue(userLocation.latitude.toString());
          setOriginLngValue(userLocation.longitude.toString());
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setOriginLatValue(userLocation.latitude.toString());
      setOriginLngValue(userLocation.longitude.toString());
    }
  };

  // 3. Helper to copy active reserved or selected charger coordinates into Dest Lat and Dest Lng
  const syncDestinationToCharger = () => {
    const reservedCharger = activeReservation
      ? chargers.find((c) => c.id === activeReservation.chargerId) ||
        (selectedCharger?.id === activeReservation.chargerId ? selectedCharger : null)
      : null;
    const targetCharger = selectedCharger || reservedCharger;

    if (targetCharger && targetCharger.latitude != null && targetCharger.longitude != null) {
      setDestLatValue(targetCharger.latitude.toString());
      setDestLngValue(targetCharger.longitude.toString());
    }
  };

  const handleTabChange = (tab: 'nearby' | 'route') => {
    setActiveTab(tab);
    if (tab === 'route') {
      syncDestinationToCharger();
    }
  };

  // Automatically sync destination if activeTab is 'route' and reserved/selected charger changes
  useEffect(() => {
    if (activeTab === 'route') {
      syncDestinationToCharger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCharger, activeReservation, chargers]);

  const handleNearbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchNearby(radiusKm * 1000);
  };

  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const origin = {
      latitude: parseFloat(currentOriginLat) || userLocation.latitude,
      longitude: parseFloat(currentOriginLng) || userLocation.longitude,
    };
    const destination = {
      latitude: parseFloat(currentDestLat) || 13.0,
      longitude: parseFloat(currentDestLng) || 77.65,
    };
    onPlanRoute(origin, destination, maxDetourMeters);
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      await onReleaseReservation();
    } finally {
      setReleasing(false);
    }
  };

  const displayChargers = routePlan ? routePlan.chargers : chargers;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* ── Main Sidebar Container (Glassmorphism) ─────────────── */}
      <aside
        className={`
          fixed md:relative z-40 top-0 left-0 h-full
          w-85 sm:w-96 md:w-[420px]
          bg-slate-900/80 backdrop-blur-xl
          border-r border-slate-800/80
          shadow-2xl shadow-black/40
          flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* ── Active Reservation Banner ───────────────────────────── */}
        {activeReservation && (
          <div className="bg-gradient-to-r from-amber-600/90 to-orange-600/90 backdrop-blur-md text-white p-3.5 shadow-lg shadow-amber-500/10 flex items-center justify-between text-xs border-b border-amber-500/30">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                <Clock className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <p className="font-bold text-sm">Active Charger Lock</p>
                <p className="text-[11px] text-amber-100/80 truncate max-w-[190px] font-mono">
                  {activeReservation.chargerId.slice(0, 8)}…
                </p>
              </div>
            </div>
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 border border-white/20"
            >
              {releasing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              Release
            </button>
          </div>
        )}

        {/* ── Tab Switcher ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 p-2.5 bg-slate-900/50 border-b border-slate-800/60 gap-1.5">
          <button
            onClick={() => handleTabChange('nearby')}
            className={`py-2.5 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'nearby'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            Nearby Search
          </button>
          <button
            onClick={() => handleTabChange('route')}
            className={`py-2.5 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'route'
                ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/25 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Route className="w-4 h-4" />
            Route Corridor
          </button>
        </div>

        {/* ── Form Controls Section ───────────────────────────────── */}
        <div className="p-4 border-b border-slate-800/50 bg-slate-900/30">
          {activeTab === 'nearby' ? (
            <form onSubmit={handleNearbySubmit} className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Search Radius
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">{radiusKm} km ({radiusKm * 1000}m)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                  Find Nearby (PostGIS)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateUserLocation({ latitude: 12.9716, longitude: 77.5946 })}
                  className="px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs rounded-xl transition cursor-pointer font-semibold border border-slate-700/50"
                  title="Reset to City Center"
                >
                  Reset
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRouteSubmit} className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Trajectory Coordinates</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocationForOrigin}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Locate className="w-3 h-3" />
                  Use GPS as Start
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Origin Lat</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 12.9716"
                    value={currentOriginLat}
                    onChange={(e) => setOriginLatValue(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Origin Lng</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 77.5946"
                    value={currentOriginLng}
                    onChange={(e) => setOriginLngValue(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Dest Lat</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 13.0000"
                    value={currentDestLat}
                    onChange={(e) => setDestLatValue(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Dest Lng</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 77.6500"
                    value={currentDestLng}
                    onChange={(e) => setDestLngValue(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                  <span className="text-slate-300">Max Detour Corridor</span>
                  <span className="text-cyan-400 font-bold font-mono">{maxDetourMeters}m</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="15000"
                  step="500"
                  value={maxDetourMeters}
                  onChange={(e) => setMaxDetourMeters(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/15"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Plan Route
                </button>
                {routePlan && (
                  <button
                    type="button"
                    onClick={onClearRoute}
                    className="py-2 px-3 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer border border-slate-700/50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ── Route Corridor Summary Pill ──────────────────────────── */}
        {routePlan && (
          <div className="p-3 bg-cyan-500/10 border-b border-cyan-500/20 text-xs flex justify-between items-center">
            <div>
              <p className="font-bold text-cyan-300">Corridor: {routePlan.route.distanceKm} km</p>
              <p className="text-[11px] text-cyan-400/70">
                {routePlan.totalChargers} chargers within {routePlan.maxDetourMeters}m detour
              </p>
            </div>
            <span className="px-2.5 py-1 bg-cyan-500/15 text-cyan-400 text-[10px] font-bold rounded-full ring-1 ring-cyan-500/25">
              PostGIS
            </span>
          </div>
        )}

        {/* ── Results List Section ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex justify-between items-center px-1 mb-1.5 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            <span>
              {routePlan
                ? `Corridor Chargers (${routePlan.chargers.length})`
                : `Nearby Chargers (${chargers.length})`}
            </span>
            <span>Distance ↑</span>
          </div>

          {/* Loading skeleton */}
          {loading && displayChargers.length === 0 && (
            <div className="space-y-2.5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!loading && displayChargers.length === 0 ? (
            <div className="text-center py-14 px-4 text-slate-500 text-xs">
              <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-slate-600" />
              </div>
              <p className="font-semibold text-slate-400">No charging stations in this range</p>
              <p className="mt-1.5 text-slate-600">Try increasing your search radius or detour corridor.</p>
            </div>
          ) : (
            displayChargers.map((charger) => {
              const isSelected = selectedCharger?.id === charger.id;

              return (
                <div
                  key={charger.id}
                  onClick={() => onSelectCharger(charger)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/20'
                      : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-100 leading-tight">
                        {charger.name || charger.stationName || 'EV Station'}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[210px] mt-0.5">
                        {charger.address}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                        charger.status === 'available'
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25'
                          : charger.status === 'reserved'
                          ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
                          : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25'
                      }`}
                    >
                      {charger.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2.5 font-medium">
                    <span className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/40">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {charger.plugType}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/40">
                      <BatteryCharging className="w-3 h-3 text-cyan-400" />
                      {charger.maxPowerKw} kW
                    </span>
                    {charger.distance_meters !== undefined && (
                      <span className="ml-auto text-emerald-400 font-bold font-mono text-[10px]">
                        {(charger.distance_meters / 1000).toFixed(1)} km
                      </span>
                    )}
                    {charger.detourDistanceMeters !== undefined && (
                      <span className="ml-auto text-cyan-400 font-bold font-mono text-[10px]">
                        +{Math.round(charger.detourDistanceMeters)}m
                      </span>
                    )}
                  </div>

                  {charger.status === 'available' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReserveModal(charger);
                      }}
                      className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Reserve Charger
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
