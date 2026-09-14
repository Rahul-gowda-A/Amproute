import { Router } from 'express';
import {
	handleGetNearbyChargers,
	nearbyStationsController,
} from '../controllers/stationController.js';

export const stationRoutes = Router();
stationRoutes.get('/stations/nearby', nearbyStationsController);
stationRoutes.get('/chargers/nearby', handleGetNearbyChargers);
