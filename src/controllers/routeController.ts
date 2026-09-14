import type { Request, Response } from 'express';
import { calculateEVRoute } from '../services/routeService.js';
import type { RoutePlanRequest } from '../types/domain.js';

function isCoordinates(value: unknown): value is RoutePlanRequest['origin'] {
  if (!value || typeof value !== 'object') return false;
  const coordinates = value as Record<string, unknown>;
  return typeof coordinates.latitude === 'number'
    && Number.isFinite(coordinates.latitude)
    && coordinates.latitude >= -90
    && coordinates.latitude <= 90
    && typeof coordinates.longitude === 'number'
    && Number.isFinite(coordinates.longitude)
    && coordinates.longitude >= -180
    && coordinates.longitude <= 180;
}

function isValidPlan(value: unknown): value is RoutePlanRequest {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Record<string, unknown>;
  return isCoordinates(plan.origin)
    && isCoordinates(plan.destination)
    && typeof plan.currentBatteryPct === 'number'
    && Number.isFinite(plan.currentBatteryPct)
    && plan.currentBatteryPct >= 0
    && plan.currentBatteryPct <= 100
    && typeof plan.batteryCapacityKwh === 'number'
    && Number.isFinite(plan.batteryCapacityKwh)
    && plan.batteryCapacityKwh > 0
    && typeof plan.maxRangeKm === 'number'
    && Number.isFinite(plan.maxRangeKm)
    && plan.maxRangeKm > 0;
}

export async function planRouteController(request: Request, response: Response) {
  if (!isValidPlan(request.body)) {
    return response.status(400).json({
      error: 'origin, destination, currentBatteryPct, batteryCapacityKwh, and maxRangeKm are invalid or missing'
    });
  }

  try {
    return response.json(await calculateEVRoute(request.body));
  } catch (error) {
    console.error('Route planning failed:', error);
    return response.status(500).json({ error: 'Unable to calculate route' });
  }
}