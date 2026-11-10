import type { Request, Response } from 'express';
import { planRouteWithChargers } from '../services/routeService.js';
import { planRouteSchema } from '../validators/schemas.js';

export async function handlePlanRoute(request: Request, response: Response) {
  const parseResult = planRouteSchema.safeParse(request.body);

  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map((e) => e.message).join('; ');
    return response.status(400).json({
      error: errorMessages || 'Invalid route parameters',
      issues: parseResult.error.issues,
    });
  }

  const { originLat, originLng, destLat, destLng, maxDetourMeters } = parseResult.data;

  try {
    const routePlan = await planRouteWithChargers(
      originLat,
      originLng,
      destLat,
      destLng,
      maxDetourMeters
    );
    return response.json(routePlan);
  } catch (error) {
    console.error('Route planning failed:', error);
    return response.status(500).json({ error: 'Unable to calculate route' });
  }
}

export const planRouteController = handlePlanRoute;
