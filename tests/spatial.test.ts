import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

describe('Spatial Search & Route Planning Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/chargers/nearby', () => {
    it('returns nearby chargers sorted in ascending order of distance', async () => {
      const res = await request(app)
        .get('/api/chargers/nearby')
        .query({ lat: 12.9716, lng: 77.5946, radius: 10000 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Verify all items are within the specified radius
      for (const item of res.body) {
        expect(Number(item.distance_meters)).toBeLessThanOrEqual(10000);
        expect(typeof item.id).toBe('string');
        expect(typeof item.name).toBe('string');
        expect(typeof item.latitude).toBe('number');
        expect(typeof item.longitude).toBe('number');
      }

      // Verify sorted distance ordering (strictly ascending)
      for (let i = 0; i < res.body.length - 1; i++) {
        const currentDistance = Number(res.body[i].distance_meters);
        const nextDistance = Number(res.body[i + 1].distance_meters);
        expect(currentDistance).toBeLessThanOrEqual(nextDistance);
      }
    });

    it('rejects coordinates out of range with 400 Bad Request (Zod validation)', async () => {
      const invalidLatRes = await request(app)
        .get('/api/chargers/nearby')
        .query({ lat: 95, lng: 77.5946, radius: 5000 });
      expect(invalidLatRes.status).toBe(400);
      expect(invalidLatRes.body.error).toBeDefined();

      const invalidLngRes = await request(app)
        .get('/api/chargers/nearby')
        .query({ lat: 12.9716, lng: 200, radius: 5000 });
      expect(invalidLngRes.status).toBe(400);
      expect(invalidLngRes.body.error).toBeDefined();
    });

    it('rejects negative or zero radius with 400 Bad Request', async () => {
      const negativeRadiusRes = await request(app)
        .get('/api/chargers/nearby')
        .query({ lat: 12.9716, lng: 77.5946, radius: -100 });
      expect(negativeRadiusRes.status).toBe(400);

      const zeroRadiusRes = await request(app)
        .get('/api/chargers/nearby')
        .query({ lat: 12.9716, lng: 77.5946, radius: 0 });
      expect(zeroRadiusRes.status).toBe(400);
    });
  });

  describe('POST /api/routes/plan', () => {
    it('plans route and finds chargers within maxDetourMeters corridor', async () => {
      const res = await request(app)
        .post('/api/routes/plan')
        .send({
          originLat: 12.9716,
          originLng: 77.5946,
          destLat: 13.0000,
          destLng: 77.6500,
          maxDetourMeters: 5000,
        });

      expect(res.status).toBe(200);
      expect(res.body.route).toBeDefined();
      expect(res.body.route.distanceMeters).toBeGreaterThan(0);
      expect(res.body.maxDetourMeters).toBe(5000);
      expect(Array.isArray(res.body.chargers)).toBe(true);

      // Verify each charger is within maxDetourMeters from the corridor
      for (const charger of res.body.chargers) {
        expect(charger.detourDistanceMeters).toBeLessThanOrEqual(5000);
        expect(charger.id).toBeDefined();
        expect(charger.stationId).toBeDefined();
        expect(charger.location).toBeDefined();
        expect(typeof charger.location.latitude).toBe('number');
        expect(typeof charger.location.longitude).toBe('number');
      }

      // Verify distance ordering from origin
      for (let i = 0; i < res.body.chargers.length - 1; i++) {
        expect(res.body.chargers[i].distanceFromOriginMeters).toBeLessThanOrEqual(
          res.body.chargers[i + 1].distanceFromOriginMeters
        );
      }
    });

    it('accepts nested origin and destination format', async () => {
      const res = await request(app)
        .post('/api/routes/plan')
        .send({
          origin: { latitude: 12.9716, longitude: 77.5946 },
          destination: { latitude: 13.0000, longitude: 77.6500 },
          maxDetourMeters: 3000,
        });

      expect(res.status).toBe(200);
      expect(res.body.route).toBeDefined();
      expect(res.body.maxDetourMeters).toBe(3000);
    });

    it('rejects missing or invalid route coordinates with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/routes/plan')
        .send({
          originLat: 'invalid',
          originLng: 77.5946,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api-docs (OpenAPI documentation)', () => {
    it('serves OpenAPI interactive documentation or redirect at /api-docs', async () => {
      const res = await request(app).get('/api-docs/');
      expect([200, 301, 302]).toContain(res.status);
    });

    it('serves OpenAPI JSON spec at /api-docs.json', async () => {
      const res = await request(app).get('/api-docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.paths).toBeDefined();
      expect(res.body.paths['/api/chargers/{id}/reserve']).toBeDefined();
      expect(res.body.paths['/api/chargers/{id}/release']).toBeDefined();
      expect(res.body.paths['/api/chargers/nearby']).toBeDefined();
      expect(res.body.paths['/api/routes/plan']).toBeDefined();
    });
  });
});

