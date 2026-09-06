import { pool } from '../config/db.js';

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
