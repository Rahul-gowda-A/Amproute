import { Router } from 'express';
import { handlePlanRoute } from '../controllers/routeController.js';

export const routeRoutes = Router();

/**
 * @openapi
 * /api/routes/plan:
 *   post:
 *     summary: Plan EV route and find chargers along corridor
 *     description: Calculates route line between origin and destination coordinates, finding chargers within maxDetourMeters using PostGIS ST_DWithin spatial queries on the corridor trajectory.
 *     tags:
 *       - Routes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originLat
 *               - originLng
 *               - destLat
 *               - destLng
 *             properties:
 *               originLat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 12.9716
 *                 description: Origin latitude (-90 to 90)
 *               originLng:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 77.5946
 *                 description: Origin longitude (-180 to 180)
 *               destLat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 13.0000
 *                 description: Destination latitude (-90 to 90)
 *               destLng:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 77.6500
 *                 description: Destination longitude (-180 to 180)
 *               maxDetourMeters:
 *                 type: number
 *                 minimum: 1
 *                 default: 5000
 *                 example: 5000
 *                 description: Maximum detour distance from route corridor in meters
 *     responses:
 *       200:
 *         description: Route planned successfully with chargers along the trajectory
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoutePlanResponse'
 *       400:
 *         description: Validation failed (invalid coordinates or non-positive detour)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
routeRoutes.post('/routes/plan', handlePlanRoute);
routeRoutes.post('/plan', handlePlanRoute);
