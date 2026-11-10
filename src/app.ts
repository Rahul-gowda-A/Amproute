import cors from 'cors';
import express from 'express';
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

