import { Router } from 'express';
import { planRouteController } from '../controllers/routeController.js';

export const routeRoutes = Router();
routeRoutes.post('/routes/plan', planRouteController);