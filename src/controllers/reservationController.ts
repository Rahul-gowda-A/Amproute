import type { Request, Response } from 'express';
import { releaseCharger, reserveCharger } from '../services/reservationService.js';
import type { ReserveChargerRequest } from '../types/domain.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getUserId(request: Request): string | null {
  const body = request.body as Partial<ReserveChargerRequest>;
  return typeof body.userId === 'string' && uuidPattern.test(body.userId) ? body.userId : null;
}

function getErrorStatus(error: unknown): number {
  if (error instanceof Error && error.message === 'CHARGER_NOT_FOUND') return 404;
  if (error instanceof Error && ['CHARGER_LOCKED', 'CHARGER_UNAVAILABLE', 'LOCK_NOT_OWNED', 'CHARGER_NOT_RESERVED'].includes(error.message)) return 409;
  return 500;
}

function getErrorMessage(error: unknown, action: 'reserve' | 'release'): string {
  if (error instanceof Error) {
    if (error.message === 'CHARGER_LOCKED' || error.message === 'CHARGER_UNAVAILABLE') {
      return 'Charger is already reserved or unavailable';
    }
    if (error.message === 'LOCK_NOT_OWNED') {
      return 'You do not own the charger lock';
    }
    if (error.message === 'CHARGER_NOT_RESERVED') {
      return 'Charger is not currently reserved';
    }
  }
  return `Unable to ${action} charger`;
}

export async function reserveChargerController(request: Request<{ id: string }>, response: Response) {
  const userId = getUserId(request);
  if (!uuidPattern.test(request.params.id) || !userId) {
    return response.status(400).json({ error: 'charger id and userId must be valid UUIDs' });
  }
  try {
    return response.json(await reserveCharger(request.params.id, userId));
  } catch (error) {
    console.error('Charger reservation failed:', error instanceof Error ? error.message : error);
    return response.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'reserve') });
  }
}

export async function releaseChargerController(request: Request<{ id: string }>, response: Response) {
  const userId = getUserId(request);
  if (!uuidPattern.test(request.params.id) || !userId) {
    return response.status(400).json({ error: 'charger id and userId must be valid UUIDs' });
  }
  try {
    return response.json(await releaseCharger(request.params.id, userId));
  } catch (error) {
    console.error('Charger release failed:', error);
    return response.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'release') });
  }
}