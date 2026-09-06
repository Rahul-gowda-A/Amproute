import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { stationRoutes } from './routes/stationRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api', stationRoutes);

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${config.PORT}`);
});
