import React, { useState } from 'react';
import type { Charger, ReservationResponse } from '../types';
import { reserveCharger } from '../services/api';
import { X, Zap, BatteryCharging, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface ReservationModalProps {
  charger: Charger | null;
  isOpen: boolean;
  onClose: () => void;
  onReservationSuccess: (res: ReservationResponse, charger: Charger) => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  charger,
  isOpen,
  onClose,
  onReservationSuccess,
}) => {
  // Pre-generate a test UUID for ease of use
  const [userId, setUserId] = useState<string>(() => crypto.randomUUID());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ReservationResponse | null>(null);

  if (!isOpen || !charger) return null;

  const handleGenerateNewId = () => {
    setUserId(crypto.randomUUID());
  };

  const handleReserve = async () => {
    if (!charger) return;
    setLoading(true);
    setError(null);

    try {
      const result = await reserveCharger(charger.id, userId);
      setSuccess(result);
      onReservationSuccess(result, charger);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      setError(
        axiosError.response?.data?.error ||
          axiosError.message ||
          'Failed to reserve charger. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-linear-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Zap className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base">Reserve Charger Slot</h3>
              <p className="text-xs text-emerald-100">Instant distributed lock reservation</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">Reservation Confirmed!</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">
                Charger slot successfully locked for 15 minutes under your User ID.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl text-left text-xs font-mono text-gray-700 break-all border border-gray-200">
                <span className="font-semibold block text-gray-500 mb-1">Lock Owner (User ID):</span>
                {success.userId}
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Close & View Map
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Charger details preview */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">
                      {charger.name || charger.stationName || 'Charging Station'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">{charger.address}</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-md">
                    {charger.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Plug: <strong>{charger.plugType}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BatteryCharging className="w-3.5 h-3.5 text-blue-500" />
                    <span>Power: <strong>{charger.maxPowerKw} kW</strong></span>
                  </div>
                </div>
              </div>

              {/* User ID Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-gray-700">Reserving User ID (UUID)</label>
                  <button
                    type="button"
                    onClick={handleGenerateNewId}
                    className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    Generate New
                  </button>
                </div>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Concurrency Info Pill */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Uses Redis atomic locks to guarantee exclusive slot reservation and prevent simultaneous race conditions.
                </span>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-1/3 py-2.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReserve}
                  disabled={loading || !userId}
                  className="w-2/3 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Acquiring Lock...
                    </>
                  ) : (
                    'Confirm Reservation'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;

