import type { Request, Response } from 'express';
import { releaseCharger, reserveCharger } from '../services/reservationService.js';
import { uuidSchema } from '../validators/schemas.js';

function extractIds(
  request: Request
): { chargerId: string; userId: string } | { error: string } {
  const chargerIdCandidate = request.params.id || request.body?.chargerId;
  const userIdCandidate = request.body?.userId;

  const chargerIdResult = uuidSchema.safeParse(chargerIdCandidate);
  const userIdResult = uuidSchema.safeParse(userIdCandidate);

  if (!chargerIdResult.success || !userIdResult.success) {
    return { error: 'charger id and userId must be valid UUIDs' };
  }

  return {
    chargerId: chargerIdResult.data,
    userId: userIdResult.data,
  };
}

function getErrorStatus(error: unknown): number {
  if (error instanceof Error && error.message === 'CHARGER_NOT_FOUND') return 404;
  if (
    error instanceof Error &&
    ['CHARGER_LOCKED', 'CHARGER_UNAVAILABLE', 'LOCK_NOT_OWNED', 'CHARGER_NOT_RESERVED'].includes(
      error.message
    )
  ) {
    return 409;
  }
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
    if (error.message === 'CHARGER_NOT_FOUND') {
      return 'Charger not found';
    }
  }
  return `Unable to ${action} charger`;
}

export async function reserveChargerController(request: Request, response: Response) {
  const extracted = extractIds(request);
  if ('error' in extracted) {
    return response.status(400).json({ error: extracted.error });
  }

  try {
    const reservation = await reserveCharger(extracted.chargerId, extracted.userId);
    return response.json(reservation);
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 500) {
      console.error('Charger reservation unexpected failure:', error);
    }
    return response.status(status).json({ error: getErrorMessage(error, 'reserve') });
  }
}

export async function releaseChargerController(request: Request, response: Response) {
  const extracted = extractIds(request);
  if ('error' in extracted) {
    return response.status(400).json({ error: extracted.error });
  }

  try {
    const release = await releaseCharger(extracted.chargerId, extracted.userId);
    return response.json(release);
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 500) {
      console.error('Charger release unexpected failure:', error);
    }
    return response.status(status).json({ error: getErrorMessage(error, 'release') });
  }
}
