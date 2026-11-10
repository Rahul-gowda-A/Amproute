import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ev_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  SEED_CENTER_LAT: z.coerce.number().min(-90).max(90).default(12.9716),
  SEED_CENTER_LON: z.coerce.number().min(-180).max(180).default(77.5946),
  SEED_RADIUS_M: z.coerce.number().positive().max(50000).default(50000),
  SEED_STATION_COUNT: z.coerce.number().int().positive().default(1000),
  DB_SSL: z.enum(['true', 'false']).optional(),
});

export const config = envSchema.parse(process.env);
