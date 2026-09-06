import { Router } from 'express';
import { nearbyStationsController } from '../controllers/stationController.js';

export const stationRoutes = Router();
stationRoutes.get('/stations/nearby', nearbyStationsController);
