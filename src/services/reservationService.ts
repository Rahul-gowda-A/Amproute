import { pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import type { ReservationResponse } from '../types/domain.js';

const LOCK_EXPIRATION_SECONDS = 900;

function lockKey(chargerId: string): string {
  return `charger:lock:${chargerId}`;
}

export async function acquireChargerLock(chargerId: string, userId: string): Promise<boolean> {
  const result = await redis.set(lockKey(chargerId), userId, {
    nx: true,
    ex: LOCK_EXPIRATION_SECONDS
  });
  return result === 'OK';
}

export async function releaseChargerLock(chargerId: string, userId: string): Promise<boolean> {
  const result = await redis.eval(
    `if redis.call('get', KEYS[1]) == ARGV[1] then
       return redis.call('del', KEYS[1])
     end
     return 0`,
    [lockKey(chargerId)],
    [userId]
  );
  return result === 1;
}

export async function reserveCharger(chargerId: string, userId: string): Promise<ReservationResponse> {
  if (!(await acquireChargerLock(chargerId, userId))) {
    throw new Error('CHARGER_LOCKED');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const charger = await client.query<{ status: ReservationResponse['status'] }>(
      'SELECT status FROM chargers WHERE id = $1 FOR UPDATE',
      [chargerId]
    );
    if (charger.rowCount === 0) throw new Error('CHARGER_NOT_FOUND');
    if (charger.rows[0].status !== 'available') throw new Error('CHARGER_UNAVAILABLE');

    await client.query(
      "UPDATE chargers SET status = 'reserved', reserved_by = $2 WHERE id = $1",
      [chargerId, userId]
    );
    await client.query('COMMIT');
    return { chargerId, userId, status: 'reserved' };
  } catch (error) {
    await client.query('ROLLBACK');
    await releaseChargerLock(chargerId, userId);
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseCharger(chargerId: string, userId: string): Promise<ReservationResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const charger = await client.query<{ status: ReservationResponse['status']; reserved_by: string | null }>(
      'SELECT status, reserved_by FROM chargers WHERE id = $1 FOR UPDATE',
      [chargerId]
    );
    if (charger.rowCount === 0) throw new Error('CHARGER_NOT_FOUND');
    if (charger.rows[0].status !== 'reserved') throw new Error('CHARGER_NOT_RESERVED');
    if (charger.rows[0].reserved_by !== null && charger.rows[0].reserved_by !== userId) {
      throw new Error('LOCK_NOT_OWNED');
    }

    const result = await client.query<{ status: ReservationResponse['status'] }>(
      "UPDATE chargers SET status = 'available', reserved_by = NULL WHERE id = $1 RETURNING status",
      [chargerId]
    );
    await client.query('COMMIT');
    await releaseChargerLock(chargerId, userId);
    if (result.rowCount === 0) throw new Error('CHARGER_NOT_RESERVED');
    return { chargerId, userId, status: result.rows[0].status };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createReservation(
  chargerId: string,
  startsAt: Date,
  endsAt: Date,
  userId?: string
) {
  const result = await pool.query(
    `INSERT INTO reservations (charger_id, user_id, starts_at, ends_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, charger_id, user_id, starts_at, ends_at, status`,
    [chargerId, userId ?? null, startsAt, endsAt]
  );
  return result.rows[0];
}
