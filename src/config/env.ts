import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/ev_db'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  PORT: z.coerce.number().int().positive().default(8000),
  SEED_CENTER_LAT: z.coerce.number().min(-90).max(90).default(12.9716),
  SEED_CENTER_LON: z.coerce.number().min(-180).max(180).default(77.5946),
  SEED_RADIUS_M: z.coerce.number().positive().max(50000).default(50000),
  SEED_STATION_COUNT: z.coerce.number().int().positive().default(1000)
});

export const config = envSchema.parse(process.env);
