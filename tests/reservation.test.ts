import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { inMemoryRedisInstance } from '../src/config/redis.js';

describe('Reservation Concurrency & Lock Ownership Tests', () => {
  let testStationId: string;
  let testChargerId: string;
  const user1 = '11111111-1111-4111-8111-111111111111';
  const user2 = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    // Insert a test station and available charger
    const stationRes = await pool.query<{ id: string }>(
      `INSERT INTO stations (name, address, location)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography)
       RETURNING id`,
      ['Test Station for Concurrency', '123 Test Ave', 77.5946, 12.9716]
    );
    testStationId = stationRes.rows[0].id;

    const chargerRes = await pool.query<{ id: string }>(
      `INSERT INTO chargers (station_id, plug_type, max_power_kw, status, price_per_kwh)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [testStationId, 'CCS2', 150.0, 'available', 18.0]
    );
    testChargerId = chargerRes.rows[0].id;
  });

  afterAll(async () => {
    if (testChargerId) {
      await pool.query('DELETE FROM chargers WHERE id = $1', [testChargerId]);
    }
    if (testStationId) {
      await pool.query('DELETE FROM stations WHERE id = $1', [testStationId]);
    }
    await pool.end();
  });

  beforeEach(() => {
    inMemoryRedisInstance.clear();
  });

  it('rejects reservation with invalid UUID format (Zod validation)', async () => {
    const res = await request(app)
      .post('/api/chargers/not-a-uuid/reserve')
      .send({ userId: user1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects reservation with invalid userId format (Zod validation)', async () => {
    const res = await request(app)
      .post(`/api/chargers/${testChargerId}/reserve`)
      .send({ userId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('handles simultaneous reserve attempts: exactly one succeeds, other is rejected (409)', async () => {
    // Reset charger status in DB to available
    await pool.query("UPDATE chargers SET status = 'available', reserved_by = NULL WHERE id = $1", [
      testChargerId,
    ]);

    // Send two concurrent reservation attempts simultaneously
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/chargers/${testChargerId}/reserve`).send({ userId: user1 }),
      request(app).post(`/api/chargers/${testChargerId}/reserve`).send({ userId: user2 }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = res1.status === 200 ? res1 : res2;
    const loser = res1.status === 409 ? res1 : res2;

    expect(winner.body.status).toBe('reserved');
    expect(loser.body.error).toMatch(/already reserved|unavailable/i);
  });

  it('rejects release attempt by a user who does not own the lock (409 LOCK_NOT_OWNED)', async () => {
    // Ensure charger is reserved by user1
    await pool.query("UPDATE chargers SET status = 'reserved', reserved_by = $2 WHERE id = $1", [
      testChargerId,
      user1,
    ]);
    await inMemoryRedisInstance.set(`charger:lock:${testChargerId}`, user1);

    // user2 attempts to release user1's reservation
    const res = await request(app)
      .post(`/api/chargers/${testChargerId}/release`)
      .send({ userId: user2 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/do not own the charger lock/i);
  });

  it('successfully releases charger when requested by valid owner (200 OK)', async () => {
    // Ensure charger is reserved by user1
    await pool.query("UPDATE chargers SET status = 'reserved', reserved_by = $2 WHERE id = $1", [
      testChargerId,
      user1,
    ]);
    await inMemoryRedisInstance.set(`charger:lock:${testChargerId}`, user1);

    // user1 releases the charger
    const res = await request(app)
      .post(`/api/chargers/${testChargerId}/release`)
      .send({ userId: user1 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('available');

    // Verify database reflects available status
    const dbCheck = await pool.query<{ status: string; reserved_by: string | null }>(
      'SELECT status, reserved_by FROM chargers WHERE id = $1',
      [testChargerId]
    );
    expect(dbCheck.rows[0].status).toBe('available');
    expect(dbCheck.rows[0].reserved_by).toBeNull();
  });

  it('rejects release of an already available charger (409)', async () => {
    const res = await request(app)
      .post(`/api/chargers/${testChargerId}/release`)
      .send({ userId: user1 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not currently reserved/i);
  });
});

