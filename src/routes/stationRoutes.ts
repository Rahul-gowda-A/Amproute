import { Router } from 'express';
import {
  handleGetNearbyChargers,
  nearbyStationsController,
} from '../controllers/stationController.js';

export const stationRoutes = Router();

/**
 * @openapi
 * /api/chargers/nearby:
 *   get:
 *     summary: Find nearby charging stations
 *     description: Searches for charging stations within a given radius (meters) using PostGIS spatial ST_DWithin and ST_Distance queries, returning results sorted in ascending order of distance.
 *     tags:
 *       - Chargers
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate of center point (-90 to 90)
 *         example: 12.9716
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate of center point (-180 to 180)
 *         example: 77.5946
 *       - in: query
 *         name: radius
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 1
 *         description: Search radius in meters
 *         example: 5000
 *     responses:
 *       200:
 *         description: Successfully retrieved list of nearby stations/chargers sorted by distance
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   distance_meters:
 *                     type: number
 *       400:
 *         description: Validation failed (out of bounds coordinates or invalid/non-positive radius)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
stationRoutes.get('/chargers/nearby', handleGetNearbyChargers);
stationRoutes.get('/stations/nearby', nearbyStationsController);
stationRoutes.get('/nearby', handleGetNearbyChargers);
