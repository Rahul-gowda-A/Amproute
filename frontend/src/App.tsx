import React, { useState, useEffect, useCallback } from 'react';
import type { Charger, Coordinates, ReservationResponse, RoutePlanResponse } from './types';
import {
  fetchNearbyChargers,
  planRoute,
  releaseCharger,
  fetchOsrmRoute,
} from './services/api';
import Map from './components/Map';
import Sidebar from './components/Sidebar';
import ReservationModal from './components/ReservationModal';
import {
  Zap,
  Menu,
  X,
  BookOpen,
  LocateFixed,
  AlertTriangle,
} from 'lucide-react';

const DEFAULT_LOCATION: Coordinates = {
  latitude: 12.9716,
  longitude: 77.5946,
};

export const App: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Coordinates>(DEFAULT_LOCATION);
  const [originLat, setOriginLat] = useState<string>('');
  const [originLng, setOriginLng] = useState<string>('');
  const [destLat, setDestLat] = useState<string>('');
  const [destLng, setDestLng] = useState<string>('');
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  const [osrmPolyline, setOsrmPolyline] = useState<[number, number][] | null>(null);
  const [activeReservation, setActiveReservation] = useState<ReservationResponse | null>(() => {
    const saved = localStorage.getItem('amproute_reservation');
    return saved ? JSON.parse(saved) : null;
  });
  const [isReserveModalOpen, setIsReserveModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync originLat & originLng whenever userLocation changes if already initialized
  useEffect(() => {
    if (userLocation) {
      setOriginLat(userLocation.latitude.toString());
      setOriginLng(userLocation.longitude.toString());
    }
  }, [userLocation]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch nearby chargers using PostGIS
  const loadNearby = useCallback(
    async (radiusMeters: number = 5000) => {
      setLoading(true);
      try {
        const results = await fetchNearbyChargers(
          userLocation.latitude,
          userLocation.longitude,
          radiusMeters
        );
        setChargers(results);
      } catch (err) {
        console.error('Failed to load nearby chargers:', err);
        showToast('Unable to connect to backend API. Please ensure server is running.');
      } finally {
        setLoading(false);
      }
    },
    [userLocation]
  );

  useEffect(() => {
    loadNearby(10000);
  }, [loadNearby]);

  // Auto-center map on browser geolocation at startup & initialize origin coordinates
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(coords);
          setOriginLat(pos.coords.latitude.toString());
          setOriginLng(pos.coords.longitude.toString());
          showToast('Map centered on your current location');
        },
        () => {
          // keep default location if permission denied
          setOriginLat(DEFAULT_LOCATION.latitude.toString());
          setOriginLng(DEFAULT_LOCATION.longitude.toString());
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setOriginLat(DEFAULT_LOCATION.latitude.toString());
      setOriginLng(DEFAULT_LOCATION.longitude.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(coords);
          setOriginLat(pos.coords.latitude.toString());
          setOriginLng(pos.coords.longitude.toString());
          loadNearby(5000);
          showToast('Updated view to current GPS location');
        },
        () => {
          showToast('Geolocation permission denied. Using default coordinates.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Route Corridor Planning
  const handlePlanRoute = async (
    origin: Coordinates,
    destination: Coordinates,
    maxDetour: number = 5000
  ) => {
    setLoading(true);
    try {
      // 1. Fetch road-snapped polyline from OSRM (non-blocking fallback)
      try {
        const roadCoords = await fetchOsrmRoute(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        );
        setOsrmPolyline(roadCoords);
      } catch (osrmErr) {
        console.warn('OSRM route fetch failed:', osrmErr);
        setOsrmPolyline(null); // Fall back to straight-line trajectory
      }

      // 2. Fetch corridor chargers from backend API
      try {
        const plan = await planRoute(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude,
          maxDetour
        );
        setRoutePlan(plan);
        showToast(`Route planned: ${plan.totalChargers} chargers along corridor`);
      } catch {
        // Fallback minimal route plan so map renders origin/destination pins & polyline
        setRoutePlan({
          route: {
            origin,
            destination,
            distanceMeters: 0,
            distanceKm: 0,
            trajectory: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
          },
          maxDetourMeters: maxDetour,
          totalChargers: selectedCharger ? 1 : 0,
          chargers: selectedCharger ? [selectedCharger] : [],
        });
        showToast('Road route plotted to destination');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      showToast(
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Route calculation failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearRoute = () => {
    setRoutePlan(null);
    setOsrmPolyline(null);
    setSelectedCharger(null);
    setDestLat('');
    setDestLng('');
  };

  // Reservation handling
  const handleOpenReserveModal = (charger: Charger) => {
    setSelectedCharger(charger);
    setIsReserveModalOpen(true);
  };

  const handleReservationSuccess = async (
    res: ReservationResponse,
    reservedCharger?: Charger
  ) => {
    setActiveReservation(res);
    localStorage.setItem('amproute_reservation', JSON.stringify(res));

    // Update charger status locally
    setChargers((prev) =>
      prev.map((c) =>
        c.id === res.chargerId ? { ...c, status: 'reserved' } : c
      )
    );

    // 2. Capture its exact latitude and longitude
    const bookedCharger =
      reservedCharger ||
      (selectedCharger && selectedCharger.id === res.chargerId ? selectedCharger : null) ||
      chargers.find((c) => c.id === res.chargerId);

    if (bookedCharger) {
      const targetLat = bookedCharger.latitude;
      const targetLng = bookedCharger.longitude;

      // 3. Immediately update the destination coordinate state variables (destLat and destLng)
      setDestLat(targetLat.toString());
      setDestLng(targetLng.toString());
      setSelectedCharger(bookedCharger);

      // 4. Automatically trigger the route fetching/planning function using current origin coordinates
      // and the new charger destination coordinates so the map draws the OSRM route directly
      const origin: Coordinates = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
      const destination: Coordinates = {
        latitude: targetLat,
        longitude: targetLng,
      };

      await handlePlanRoute(origin, destination, 5000);
      showToast(
        `Reservation confirmed — routed to ${bookedCharger.name || bookedCharger.stationName || 'charger'}`
      );
    } else {
      showToast('Reservation confirmed');
    }
  };

  const handleReleaseReservation = async () => {
    if (!activeReservation) return;
    try {
      await releaseCharger(activeReservation.chargerId, activeReservation.userId);
      setChargers((prev) =>
        prev.map((c) =>
          c.id === activeReservation.chargerId ? { ...c, status: 'available' } : c
        )
      );
      // Clear everything: reservation, route, polyline, selection, and reset destination
      setActiveReservation(null);
      localStorage.removeItem('amproute_reservation');
      setRoutePlan(null);
      setOsrmPolyline(null);
      setSelectedCharger(null);
      setDestLat('');
      setDestLng('');
      showToast('Charger released — map cleared');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      showToast(
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to release charger'
      );
    }
  };

  // Charger selection → auto-update destination & plan route
  const handleSelectCharger = (charger: Charger) => {
    setSelectedCharger(charger);
    setDestLat(charger.latitude.toString());
    setDestLng(charger.longitude.toString());
    handlePlanRoute(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: charger.latitude, longitude: charger.longitude },
      5000
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="h-14 bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-between px-4 z-20 border-b border-slate-800 shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                AmpRoute
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-md font-mono font-medium border border-emerald-500/20">
                  PostGIS
                </span>
              </h1>
              <p className="hidden sm:block text-[10px] text-slate-500">
                EV Spatial Routing & Distributed Lock Reservations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGetLocation}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5 cursor-pointer border border-slate-700/50"
            title="Recenter to my location"
          >
            <LocateFixed className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">My Location</span>
          </button>

          <a
            href="http://localhost:3000/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Swagger API</span>
          </a>
        </div>
      </header>

      {/* ── Main Content: Sidebar + Interactive Map ────────────── */}
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar
          userLocation={userLocation}
          onUpdateUserLocation={setUserLocation}
          chargers={chargers}
          selectedCharger={selectedCharger}
          onSelectCharger={handleSelectCharger}
          onOpenReserveModal={handleOpenReserveModal}
          onSearchNearby={loadNearby}
          onPlanRoute={handlePlanRoute}
          routePlan={routePlan}
          onClearRoute={handleClearRoute}
          activeReservation={activeReservation}
          onReleaseReservation={handleReleaseReservation}
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
          loading={loading}
          originLat={originLat}
          originLng={originLng}
          destLat={destLat}
          destLng={destLng}
          onOriginLatChange={setOriginLat}
          onOriginLngChange={setOriginLng}
          onDestLatChange={setDestLat}
          onDestLngChange={setDestLng}
        />

        <main className="flex-1 h-full w-full relative">
          <Map
            userLocation={userLocation}
            chargers={chargers}
            selectedCharger={selectedCharger}
            onSelectCharger={handleSelectCharger}
            onOpenReserveModal={handleOpenReserveModal}
            routePlan={routePlan}
            osrmPolyline={osrmPolyline}
          />
        </main>
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        charger={selectedCharger}
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        onReservationSuccess={handleReservationSuccess}
      />

      {/* ── Global Toast Notification ──────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 toast-slide-in bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl shadow-black/40 flex items-center gap-2.5 text-xs border border-slate-700/60">
          <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-slate-200">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
