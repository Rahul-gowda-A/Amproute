import { Router } from 'express';
import { releaseChargerController, reserveChargerController } from '../controllers/reservationController.js';

export const reservationRoutes = Router();
reservationRoutes.post('/chargers/:id/reserve', reserveChargerController);
reservationRoutes.post('/chargers/:id/release', releaseChargerController);