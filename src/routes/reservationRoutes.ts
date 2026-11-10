import { Router } from 'express';
import {
  releaseChargerController,
  reserveChargerController,
} from '../controllers/reservationController.js';

export const reservationRoutes = Router();

/**
 * @openapi
 * /api/chargers/{id}/reserve:
 *   post:
 *     summary: Reserve a charger
 *     description: Atomically reserves a charger using Redis distributed locking and PostgreSQL row-level locks (SELECT FOR UPDATE) to ensure concurrency control.
 *     tags:
 *       - Reservations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Charger UUID to reserve
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Reserving user UUID
 *     responses:
 *       200:
 *         description: Charger successfully reserved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationResponse'
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Charger not found
 *       409:
 *         description: Charger is already reserved or unavailable
 *       500:
 *         description: Internal server error
 *
 * /api/chargers/reserve:
 *   post:
 *     summary: Reserve a charger (with chargerId in body)
 *     description: Reserves a charger by providing chargerId and userId in the JSON request body.
 *     tags:
 *       - Reservations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chargerId
 *               - userId
 *             properties:
 *               chargerId:
 *                 type: string
 *                 format: uuid
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Charger successfully reserved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationResponse'
 *       400:
 *         description: Invalid UUID format
 *       404:
 *         description: Charger not found
 *       409:
 *         description: Charger is already reserved or unavailable
 */
reservationRoutes.post('/chargers/:id/reserve', reserveChargerController);
reservationRoutes.post('/chargers/reserve', reserveChargerController);
reservationRoutes.post('/reserve', reserveChargerController);

/**
 * @openapi
 * /api/chargers/{id}/release:
 *   post:
 *     summary: Release a charger reservation
 *     description: Releases a reserved charger if the requesting user owns the lock, resetting charger status to available.
 *     tags:
 *       - Reservations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Charger UUID to release
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User UUID that owns the reservation
 *     responses:
 *       200:
 *         description: Charger successfully released
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationResponse'
 *       400:
 *         description: Invalid UUID format
 *       404:
 *         description: Charger not found
 *       409:
 *         description: Lock not owned by user or charger not reserved
 *       500:
 *         description: Internal server error
 *
 * /api/chargers/release:
 *   post:
 *     summary: Release a charger reservation (with chargerId in body)
 *     description: Releases a charger by providing chargerId and userId in the request body.
 *     tags:
 *       - Reservations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chargerId
 *               - userId
 *             properties:
 *               chargerId:
 *                 type: string
 *                 format: uuid
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Charger successfully released
 *       400:
 *         description: Invalid UUID format
 *       409:
 *         description: Lock not owned by user or charger not reserved
 */
reservationRoutes.post('/chargers/:id/release', releaseChargerController);
reservationRoutes.post('/chargers/release', releaseChargerController);
reservationRoutes.post('/release', releaseChargerController);
