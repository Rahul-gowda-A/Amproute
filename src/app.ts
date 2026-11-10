import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { reservationRoutes } from './routes/reservationRoutes.js';
import { routeRoutes } from './routes/routeRoutes.js';
import { stationRoutes } from './routes/stationRoutes.js';

export const app = express();
app.use(cors());
app.use(express.json());

// OpenAPI / Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/health', (_request, response) => response.json({ status: 'ok' }));

// Route registrations
app.use('/api', stationRoutes);
app.use('/api', routeRoutes);
app.use('/api', reservationRoutes);

// 404 Not Found Handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
